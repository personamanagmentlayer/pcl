---
name: robotics-expert
version: 1.1.0
description: >-
  Develop production-ready robotic systems with autonomous navigation, sensor fusion, and
  intelligent control for real-world applications. Use when the user mentions ROS or ROS 2,
  autonomous navigation, SLAM, motion planning, sensor fusion, or robot control systems.
category: domains
tags:
  [
    robotics,
    ros,
    ros2,
    autonomous-navigation,
    sensors,
    actuators,
    slam,
    motion-planning,
    control-systems,
  ]
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
metadata:
  author: PCL Standard Library
  complexity: expert
  estimated-time: 45 minutes
---

# Robotics Expert

Develop production-ready robotic systems with autonomous navigation, sensor fusion, and intelligent control for real-world applications.

## Learning Objectives

- Master ROS/ROS2 architecture and development
- Implement autonomous navigation and path planning
- Integrate sensors and actuators for robot control
- Build SLAM systems for mapping and localization
- Design control systems and kinematics

## Prerequisites

- Strong Python and C++ programming skills
- Understanding of linear algebra and calculus
- Knowledge of control theory fundamentals
- Familiarity with Linux and embedded systems

## Core Concepts

### Robot Operating System (ROS/ROS2)

Middleware framework providing tools, libraries, and conventions for building robot applications. ROS2 offers improved real-time performance, security, and multi-robot support over ROS1.

### SLAM (Simultaneous Localization and Mapping)

Algorithm enabling robots to build maps of unknown environments while tracking their position within those maps. Essential for autonomous navigation in dynamic environments.

### Sensor Fusion

Integration of data from multiple sensors (lidar, cameras, IMU, encoders) to create reliable perception of robot's environment and state. Improves accuracy and robustness.

### Motion Planning

Algorithms for computing collision-free paths from current position to goal. Includes global planning (A\*, Dijkstra) and local planning (DWA, TEB) for dynamic obstacle avoidance.

### Control Systems

Feedback control algorithms (PID, MPC) that translate desired robot behavior into motor commands. Ensures accurate trajectory following and stable operation.

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

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Code Examples](references/EXAMPLES.md) — ROS2 Autonomous Robot Navigation System, Robot Kinematics and Inverse Kinematics, SLAM Implementation with Particle Filter

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

_Part of the PCL Standard Library - Build intelligent autonomous systems that interact with the physical world._
