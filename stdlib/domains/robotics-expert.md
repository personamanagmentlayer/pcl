# Robotics Expert

---
skill_id: robotics-expert
name: Robotics Expert
category: domains
tags: [robotics, ros, ros2, autonomous-navigation, sensors, actuators, slam, motion-planning, control-systems]
version: 1.0.0
author: PCL Standard Library
dependencies: []
complexity: expert
estimated_time: 45 minutes
objectives:
  - Master ROS/ROS2 architecture and development
  - Implement autonomous navigation and path planning
  - Integrate sensors and actuators for robot control
  - Build SLAM systems for mapping and localization
  - Design control systems and kinematics
prerequisites:
  - Strong Python and C++ programming skills
  - Understanding of linear algebra and calculus
  - Knowledge of control theory fundamentals
  - Familiarity with Linux and embedded systems
outcome: Develop production-ready robotic systems with autonomous navigation, sensor fusion, and intelligent control for real-world applications
---

## Core Concepts

### Robot Operating System (ROS/ROS2)
Middleware framework providing tools, libraries, and conventions for building robot applications. ROS2 offers improved real-time performance, security, and multi-robot support over ROS1.

### SLAM (Simultaneous Localization and Mapping)
Algorithm enabling robots to build maps of unknown environments while tracking their position within those maps. Essential for autonomous navigation in dynamic environments.

### Sensor Fusion
Integration of data from multiple sensors (lidar, cameras, IMU, encoders) to create reliable perception of robot's environment and state. Improves accuracy and robustness.

### Motion Planning
Algorithms for computing collision-free paths from current position to goal. Includes global planning (A*, Dijkstra) and local planning (DWA, TEB) for dynamic obstacle avoidance.

### Control Systems
Feedback control algorithms (PID, MPC) that translate desired robot behavior into motor commands. Ensures accurate trajectory following and stable operation.

## Code Examples

### ROS2 Autonomous Robot Navigation System

```python
#!/usr/bin/env python3
"""
ROS2 Node for autonomous robot navigation with obstacle avoidance
"""

import rclpy
from rclpy.node import Node
from rclpy.qos import QoSProfile, ReliabilityPolicy, HistoryPolicy
from geometry_msgs.msg import Twist, PoseStamped, Pose
from nav_msgs.msg import Odometry, Path, OccupancyGrid
from sensor_msgs.msg import LaserScan, Imu
from std_msgs.msg import String
import numpy as np
import math
from typing import Tuple, List, Optional
from dataclasses import dataclass
from enum import Enum


class NavigationState(Enum):
    IDLE = "idle"
    NAVIGATING = "navigating"
    AVOIDING_OBSTACLE = "avoiding_obstacle"
    REACHED_GOAL = "reached_goal"
    FAILED = "failed"


@dataclass
class RobotPose:
    x: float
    y: float
    theta: float  # orientation in radians


@dataclass
class Goal:
    x: float
    y: float
    tolerance: float = 0.1


class AutonomousNavigator(Node):
    def __init__(self):
        super().__init__('autonomous_navigator')

        # Robot parameters
        self.max_linear_speed = 0.5  # m/s
        self.max_angular_speed = 1.0  # rad/s
        self.robot_radius = 0.2  # meters
        self.safety_distance = 0.3  # meters

        # State
        self.current_pose = RobotPose(0.0, 0.0, 0.0)
        self.current_goal: Optional[Goal] = None
        self.state = NavigationState.IDLE
        self.obstacle_detected = False
        self.scan_data: Optional[LaserScan] = None

        # PID controller for orientation
        self.angle_kp = 2.0
        self.angle_ki = 0.0
        self.angle_kd = 0.5
        self.angle_error_integral = 0.0
        self.prev_angle_error = 0.0

        # Create QoS profile
        qos_profile = QoSProfile(
            reliability=ReliabilityPolicy.BEST_EFFORT,
            history=HistoryPolicy.KEEP_LAST,
            depth=10
        )

        # Publishers
        self.cmd_vel_pub = self.create_publisher(Twist, 'cmd_vel', 10)
        self.path_pub = self.create_publisher(Path, 'planned_path', 10)
        self.state_pub = self.create_publisher(String, 'navigation_state', 10)

        # Subscribers
        self.odom_sub = self.create_subscription(
            Odometry,
            'odom',
            self.odom_callback,
            10
        )

        self.scan_sub = self.create_subscription(
            LaserScan,
            'scan',
            self.scan_callback,
            qos_profile
        )

        self.goal_sub = self.create_subscription(
            PoseStamped,
            'goal_pose',
            self.goal_callback,
            10
        )

        self.imu_sub = self.create_subscription(
            Imu,
            'imu',
            self.imu_callback,
            qos_profile
        )

        # Timer for control loop (50 Hz)
        self.control_timer = self.create_timer(0.02, self.control_loop)

        self.get_logger().info('Autonomous Navigator initialized')

    def odom_callback(self, msg: Odometry):
        """Update robot pose from odometry"""
        position = msg.pose.pose.position
        orientation = msg.pose.pose.orientation

        # Convert quaternion to euler angle (yaw)
        siny_cosp = 2 * (orientation.w * orientation.z + orientation.x * orientation.y)
        cosy_cosp = 1 - 2 * (orientation.y * orientation.y + orientation.z * orientation.z)
        yaw = math.atan2(siny_cosp, cosy_cosp)

        self.current_pose = RobotPose(position.x, position.y, yaw)

    def scan_callback(self, msg: LaserScan):
        """Process laser scan data for obstacle detection"""
        self.scan_data = msg

        # Check for obstacles in safety zone
        min_distance = min(msg.ranges)

        if min_distance < self.safety_distance:
            self.obstacle_detected = True
            if self.state == NavigationState.NAVIGATING:
                self.state = NavigationState.AVOIDING_OBSTACLE
        else:
            self.obstacle_detected = False
            if self.state == NavigationState.AVOIDING_OBSTACLE:
                self.state = NavigationState.NAVIGATING

    def imu_callback(self, msg: Imu):
        """Process IMU data for orientation refinement"""
        # Can be used for sensor fusion with odometry
        pass

    def goal_callback(self, msg: PoseStamped):
        """Receive new navigation goal"""
        self.current_goal = Goal(
            x=msg.pose.position.x,
            y=msg.pose.position.y,
            tolerance=0.1
        )

        self.state = NavigationState.NAVIGATING
        self.get_logger().info(
            f'New goal received: ({self.current_goal.x}, {self.current_goal.y})'
        )

        # Plan path to goal
        self.plan_path()

    def control_loop(self):
        """Main control loop executed at fixed rate"""
        if self.state == NavigationState.IDLE:
            self.stop_robot()
            return

        if self.current_goal is None:
            return

        # Check if goal reached
        if self.is_goal_reached():
            self.state = NavigationState.REACHED_GOAL
            self.stop_robot()
            self.get_logger().info('Goal reached!')
            return

        # Execute navigation behavior based on state
        if self.state == NavigationState.NAVIGATING:
            self.navigate_to_goal()
        elif self.state == NavigationState.AVOIDING_OBSTACLE:
            self.avoid_obstacle()

        # Publish state
        state_msg = String()
        state_msg.data = self.state.value
        self.state_pub.publish(state_msg)

    def navigate_to_goal(self):
        """Navigate towards goal using pure pursuit"""
        dx = self.current_goal.x - self.current_pose.x
        dy = self.current_goal.y - self.current_pose.y

        # Calculate distance and angle to goal
        distance = math.sqrt(dx * dx + dy * dy)
        angle_to_goal = math.atan2(dy, dx)

        # Calculate angle error
        angle_error = self.normalize_angle(angle_to_goal - self.current_pose.theta)

        # PID control for angular velocity
        self.angle_error_integral += angle_error * 0.02  # dt = 0.02s
        angle_derivative = (angle_error - self.prev_angle_error) / 0.02

        angular_velocity = (
            self.angle_kp * angle_error +
            self.angle_ki * self.angle_error_integral +
            self.angle_kd * angle_derivative
        )

        self.prev_angle_error = angle_error

        # Limit angular velocity
        angular_velocity = np.clip(
            angular_velocity,
            -self.max_angular_speed,
            self.max_angular_speed
        )

        # Linear velocity proportional to distance, reduced when turning
        linear_velocity = min(
            self.max_linear_speed,
            self.max_linear_speed * (1.0 - abs(angle_error) / math.pi) * 0.5
        )

        # Slow down near goal
        if distance < 0.5:
            linear_velocity *= distance * 2.0

        # Check for obstacles in path
        if self.obstacle_detected:
            linear_velocity *= 0.3

        # Publish velocity command
        self.publish_velocity(linear_velocity, angular_velocity)

    def avoid_obstacle(self):
        """Dynamic obstacle avoidance using Dynamic Window Approach"""
        if self.scan_data is None:
            self.stop_robot()
            return

        # Find the direction with maximum clearance
        ranges = np.array(self.scan_data.ranges)
        ranges[np.isinf(ranges)] = self.scan_data.range_max

        # Split scan into sectors
        num_sectors = 8
        sector_size = len(ranges) // num_sectors
        sector_clearances = []

        for i in range(num_sectors):
            start_idx = i * sector_size
            end_idx = start_idx + sector_size
            sector_ranges = ranges[start_idx:end_idx]
            avg_clearance = np.mean(sector_ranges)
            sector_clearances.append(avg_clearance)

        # Find best sector (prefer forward sectors if clearance is sufficient)
        best_sector = np.argmax(sector_clearances)

        # Calculate desired heading (sector angle relative to robot)
        angle_per_sector = 2 * math.pi / num_sectors
        desired_angle = (best_sector - num_sectors // 2) * angle_per_sector

        # Control to desired angle
        angular_velocity = self.angle_kp * desired_angle
        angular_velocity = np.clip(
            angular_velocity,
            -self.max_angular_speed,
            self.max_angular_speed
        )

        # Reduce speed while avoiding
        linear_velocity = self.max_linear_speed * 0.3

        # Stop if very close to obstacle
        if min(ranges) < self.robot_radius + 0.1:
            linear_velocity = 0.0

        self.publish_velocity(linear_velocity, angular_velocity)

    def plan_path(self):
        """Plan path from current pose to goal using A* algorithm"""
        # Simplified path planning - in production, use nav2 stack
        path = Path()
        path.header.frame_id = 'map'
        path.header.stamp = self.get_clock().now().to_msg()

        # Create straight line path for demonstration
        num_waypoints = 10
        for i in range(num_waypoints + 1):
            t = i / num_waypoints
            waypoint = PoseStamped()
            waypoint.header = path.header
            waypoint.pose.position.x = (
                self.current_pose.x +
                t * (self.current_goal.x - self.current_pose.x)
            )
            waypoint.pose.position.y = (
                self.current_pose.y +
                t * (self.current_goal.y - self.current_pose.y)
            )
            path.poses.append(waypoint)

        self.path_pub.publish(path)

    def is_goal_reached(self) -> bool:
        """Check if robot has reached the goal"""
        if self.current_goal is None:
            return False

        dx = self.current_goal.x - self.current_pose.x
        dy = self.current_goal.y - self.current_pose.y
        distance = math.sqrt(dx * dx + dy * dy)

        return distance < self.current_goal.tolerance

    def publish_velocity(self, linear: float, angular: float):
        """Publish velocity command"""
        cmd = Twist()
        cmd.linear.x = linear
        cmd.angular.z = angular
        self.cmd_vel_pub.publish(cmd)

    def stop_robot(self):
        """Stop the robot"""
        self.publish_velocity(0.0, 0.0)

    @staticmethod
    def normalize_angle(angle: float) -> float:
        """Normalize angle to [-pi, pi]"""
        while angle > math.pi:
            angle -= 2 * math.pi
        while angle < -math.pi:
            angle += 2 * math.pi
        return angle


def main(args=None):
    rclpy.init(args=args)
    navigator = AutonomousNavigator()

    try:
        rclpy.spin(navigator)
    except KeyboardInterrupt:
        pass
    finally:
        navigator.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
```

### Robot Kinematics and Inverse Kinematics

```python
"""
Forward and Inverse Kinematics for robotic manipulator
"""

import numpy as np
from typing import List, Tuple, Optional
from dataclasses import dataclass


@dataclass
class DHParameter:
    """Denavit-Hartenberg parameters for robot link"""
    theta: float  # Joint angle (revolute) or displacement (prismatic)
    d: float      # Link offset
    a: float      # Link length
    alpha: float  # Link twist


class RobotArm:
    def __init__(self, dh_params: List[DHParameter]):
        self.dh_params = dh_params
        self.num_joints = len(dh_params)

    def forward_kinematics(self, joint_angles: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Calculate end-effector position and orientation from joint angles

        Args:
            joint_angles: Array of joint angles [theta1, theta2, ..., thetaN]

        Returns:
            position: 3D position [x, y, z]
            orientation: 3x3 rotation matrix
        """
        T = np.eye(4)  # Transformation matrix

        for i, (dh, theta) in enumerate(zip(self.dh_params, joint_angles)):
            # Update theta for revolute joint
            theta_i = dh.theta + theta

            # DH transformation matrix
            T_i = self._dh_matrix(theta_i, dh.d, dh.a, dh.alpha)
            T = T @ T_i

        position = T[:3, 3]
        orientation = T[:3, :3]

        return position, orientation

    def inverse_kinematics(
        self,
        target_position: np.ndarray,
        target_orientation: Optional[np.ndarray] = None,
        initial_guess: Optional[np.ndarray] = None,
        max_iterations: int = 100,
        tolerance: float = 1e-4
    ) -> Optional[np.ndarray]:
        """
        Calculate joint angles for desired end-effector pose using Jacobian method

        Args:
            target_position: Desired 3D position [x, y, z]
            target_orientation: Desired 3x3 rotation matrix (optional)
            initial_guess: Initial joint angles
            max_iterations: Maximum iterations for convergence
            tolerance: Position error tolerance

        Returns:
            joint_angles: Solution joint angles or None if not converged
        """
        if initial_guess is None:
            joint_angles = np.zeros(self.num_joints)
        else:
            joint_angles = initial_guess.copy()

        for iteration in range(max_iterations):
            # Forward kinematics
            current_position, current_orientation = self.forward_kinematics(joint_angles)

            # Position error
            position_error = target_position - current_position

            # Check convergence
            if np.linalg.norm(position_error) < tolerance:
                return joint_angles

            # Calculate Jacobian
            J = self._calculate_jacobian(joint_angles)

            # Damped least squares (prevent singularities)
            lambda_damping = 0.01
            delta_theta = J.T @ np.linalg.inv(
                J @ J.T + lambda_damping * np.eye(3)
            ) @ position_error

            # Update joint angles
            joint_angles += delta_theta * 0.1  # Step size

            # Keep angles in valid range
            joint_angles = np.clip(joint_angles, -np.pi, np.pi)

        # Did not converge
        return None

    def _calculate_jacobian(self, joint_angles: np.ndarray) -> np.ndarray:
        """Calculate Jacobian matrix using numerical differentiation"""
        J = np.zeros((3, self.num_joints))
        epsilon = 1e-6

        current_pos, _ = self.forward_kinematics(joint_angles)

        for i in range(self.num_joints):
            # Perturb joint angle
            perturbed_angles = joint_angles.copy()
            perturbed_angles[i] += epsilon

            perturbed_pos, _ = self.forward_kinematics(perturbed_angles)

            # Numerical derivative
            J[:, i] = (perturbed_pos - current_pos) / epsilon

        return J

    def _dh_matrix(self, theta: float, d: float, a: float, alpha: float) -> np.ndarray:
        """Create DH transformation matrix"""
        ct = np.cos(theta)
        st = np.sin(theta)
        ca = np.cos(alpha)
        sa = np.sin(alpha)

        return np.array([
            [ct, -st * ca,  st * sa, a * ct],
            [st,  ct * ca, -ct * sa, a * st],
            [0,   sa,       ca,      d     ],
            [0,   0,        0,       1     ]
        ])

    def check_workspace(self, position: np.ndarray) -> bool:
        """Check if position is within robot workspace"""
        # Calculate maximum reach
        max_reach = sum(abs(dh.a) + abs(dh.d) for dh in self.dh_params)

        distance = np.linalg.norm(position)
        return distance <= max_reach


# Example usage
def demo_robot_arm():
    """Demonstrate robot arm kinematics"""

    # Define 3-DOF robot arm DH parameters
    dh_params = [
        DHParameter(theta=0, d=0.1, a=0, alpha=np.pi/2),
        DHParameter(theta=0, d=0, a=0.3, alpha=0),
        DHParameter(theta=0, d=0, a=0.3, alpha=0)
    ]

    robot = RobotArm(dh_params)

    # Forward kinematics test
    joint_angles = np.array([0, np.pi/4, -np.pi/4])
    position, orientation = robot.forward_kinematics(joint_angles)

    print("Forward Kinematics:")
    print(f"Joint angles: {np.degrees(joint_angles)}")
    print(f"End-effector position: {position}")
    print(f"End-effector orientation:\n{orientation}")

    # Inverse kinematics test
    target_position = np.array([0.4, 0.1, 0.2])

    print("\nInverse Kinematics:")
    print(f"Target position: {target_position}")

    solution = robot.inverse_kinematics(target_position)

    if solution is not None:
        print(f"Solution joint angles: {np.degrees(solution)}")

        # Verify solution
        verify_pos, _ = robot.forward_kinematics(solution)
        error = np.linalg.norm(verify_pos - target_position)
        print(f"Verification error: {error:.6f}")
    else:
        print("No solution found")


if __name__ == '__main__':
    demo_robot_arm()
```

### SLAM Implementation with Particle Filter

```python
"""
Simplified SLAM using particle filter (FastSLAM)
"""

import numpy as np
from typing import List, Tuple
from dataclasses import dataclass


@dataclass
class Landmark:
    x: float
    y: float
    id: int


@dataclass
class Particle:
    x: float
    y: float
    theta: float
    weight: float
    landmarks: List[Landmark]


class ParticleFilterSLAM:
    def __init__(self, num_particles: int = 100):
        self.num_particles = num_particles
        self.particles: List[Particle] = []

        # Initialize particles with random poses
        for _ in range(num_particles):
            self.particles.append(Particle(
                x=np.random.uniform(-1, 1),
                y=np.random.uniform(-1, 1),
                theta=np.random.uniform(-np.pi, np.pi),
                weight=1.0 / num_particles,
                landmarks=[]
            ))

    def predict(self, velocity: float, angular_velocity: float, dt: float):
        """Prediction step: move particles based on motion model"""
        for particle in self.particles:
            # Add noise to motion
            v_noisy = velocity + np.random.normal(0, 0.05)
            w_noisy = angular_velocity + np.random.normal(0, 0.05)

            # Update particle pose
            if abs(w_noisy) < 1e-6:
                # Straight line motion
                particle.x += v_noisy * dt * np.cos(particle.theta)
                particle.y += v_noisy * dt * np.sin(particle.theta)
            else:
                # Circular motion
                particle.x += (v_noisy / w_noisy) * (
                    np.sin(particle.theta + w_noisy * dt) - np.sin(particle.theta)
                )
                particle.y += (v_noisy / w_noisy) * (
                    np.cos(particle.theta) - np.cos(particle.theta + w_noisy * dt)
                )
                particle.theta += w_noisy * dt

            # Normalize angle
            particle.theta = np.arctan2(np.sin(particle.theta), np.cos(particle.theta))

    def update(self, observations: List[Tuple[float, float, int]]):
        """
        Update step: weight particles based on sensor observations

        Args:
            observations: List of (range, bearing, landmark_id)
        """
        for particle in self.particles:
            likelihood = 1.0

            for obs_range, obs_bearing, landmark_id in observations:
                # Data association: find or create landmark
                landmark = self._find_landmark(particle, landmark_id)

                if landmark is None:
                    # New landmark - initialize
                    landmark_x = particle.x + obs_range * np.cos(particle.theta + obs_bearing)
                    landmark_y = particle.y + obs_range * np.sin(particle.theta + obs_bearing)

                    particle.landmarks.append(Landmark(landmark_x, landmark_y, landmark_id))
                    continue

                # Calculate expected observation
                dx = landmark.x - particle.x
                dy = landmark.y - particle.y
                expected_range = np.sqrt(dx**2 + dy**2)
                expected_bearing = np.arctan2(dy, dx) - particle.theta

                # Normalize bearing
                expected_bearing = np.arctan2(
                    np.sin(expected_bearing),
                    np.cos(expected_bearing)
                )

                # Calculate likelihood
                range_error = obs_range - expected_range
                bearing_error = obs_bearing - expected_bearing

                # Normalize bearing error
                bearing_error = np.arctan2(
                    np.sin(bearing_error),
                    np.cos(bearing_error)
                )

                # Gaussian likelihood
                sigma_range = 0.1
                sigma_bearing = 0.1

                likelihood *= np.exp(
                    -(range_error**2) / (2 * sigma_range**2) -
                    (bearing_error**2) / (2 * sigma_bearing**2)
                )

            particle.weight = likelihood

        # Normalize weights
        total_weight = sum(p.weight for p in self.particles)
        if total_weight > 0:
            for particle in self.particles:
                particle.weight /= total_weight

    def resample(self):
        """Resample particles based on weights (systematic resampling)"""
        weights = [p.weight for p in self.particles]

        # Systematic resampling
        new_particles = []
        r = np.random.uniform(0, 1.0 / self.num_particles)
        c = weights[0]
        i = 0

        for m in range(self.num_particles):
            u = r + m / self.num_particles

            while u > c:
                i += 1
                c += weights[i]

            # Deep copy particle
            old_particle = self.particles[i]
            new_particle = Particle(
                x=old_particle.x,
                y=old_particle.y,
                theta=old_particle.theta,
                weight=1.0 / self.num_particles,
                landmarks=[Landmark(lm.x, lm.y, lm.id) for lm in old_particle.landmarks]
            )
            new_particles.append(new_particle)

        self.particles = new_particles

    def get_estimated_pose(self) -> Tuple[float, float, float]:
        """Get weighted average pose estimate"""
        x = sum(p.x * p.weight for p in self.particles)
        y = sum(p.y * p.weight for p in self.particles)

        # Average angle using circular statistics
        sin_sum = sum(np.sin(p.theta) * p.weight for p in self.particles)
        cos_sum = sum(np.cos(p.theta) * p.weight for p in self.particles)
        theta = np.arctan2(sin_sum, cos_sum)

        return x, y, theta

    def get_map(self) -> List[Landmark]:
        """Get map from best particle"""
        best_particle = max(self.particles, key=lambda p: p.weight)
        return best_particle.landmarks

    def _find_landmark(self, particle: Particle, landmark_id: int) -> Optional[Landmark]:
        """Find landmark by ID in particle's map"""
        for landmark in particle.landmarks:
            if landmark.id == landmark_id:
                return landmark
        return None
```

## Best Practices

### ROS Development
- Use ROS2 for new projects (improved architecture)
- Follow REP guidelines for package structure
- Implement proper lifecycle management
- Use composition for node design
- Leverage quality of service (QoS) profiles
- Write comprehensive launch files
- Maintain separation between logic and ROS interfaces

### Sensor Integration
- Implement sensor fusion for redundancy
- Calibrate sensors properly (intrinsic, extrinsic)
- Handle sensor failures gracefully
- Use appropriate data structures (PointCloud2, Image)
- Synchronize multi-sensor data with message filters
- Apply noise filtering and outlier rejection
- Monitor sensor health and diagnostics

### Motion Planning
- Use proven algorithms (RRT*, A*, DWA)
- Implement both global and local planners
- Consider kinematic and dynamic constraints
- Handle dynamic obstacles
- Optimize for computational efficiency
- Provide smooth trajectories
- Implement recovery behaviors

### Safety & Reliability
- Implement emergency stop mechanisms
- Add watchdog timers for critical systems
- Validate all sensor inputs
- Use redundant safety sensors
- Implement collision detection
- Test failure modes extensively
- Follow functional safety standards (ISO 13849)

## Anti-Patterns

### Common Mistakes
- Not handling coordinate frame transformations
- Ignoring timing and synchronization issues
- Hardcoding parameters instead of using config files
- Not implementing proper error handling
- Blocking callbacks with long computations
- Not tuning PID controllers properly
- Inadequate testing in simulation

### Design Issues
- Monolithic nodes instead of modular design
- Tight coupling between components
- Not considering real-time constraints
- Inadequate logging and diagnostics
- Missing simulation environment
- Not accounting for sensor noise and uncertainty
- Poor cable management and mechanical design

## Resources

### Frameworks & Middleware
- ROS2 - Robot Operating System 2
- ROS1 (legacy) - Original ROS
- Gazebo - Robot simulation
- MoveIt - Motion planning framework
- Nav2 - Navigation stack
- BehaviorTree.CPP - Behavior trees

### Hardware Platforms
- TurtleBot - Educational platform
- Universal Robots - Collaborative arms
- Boston Dynamics Spot - Quadruped
- DJI Drones - Aerial platforms
- NVIDIA Jetson - Edge AI compute
- Arduino/Raspberry Pi - Embedded control

### Sensors & Actuators
- Velodyne/Ouster - Lidar sensors
- Intel RealSense - Depth cameras
- Sick/Hokuyo - 2D lidar
- Dynamixel - Smart servos
- MaxonMotor - High-performance motors
- Mujoco - Physics simulation

### Learning Resources
- ROS2 Documentation
- Modern Robotics textbook
- Probabilistic Robotics (Thrun)
- Planning Algorithms (LaValle)
- The Construct - ROS courses
- Robotics Stack Exchange

---

*Part of the PCL Standard Library - Build intelligent autonomous systems that interact with the physical world.*
