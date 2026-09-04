# CI/CD Expert — Jenkins

Reference material for the `cicd-expert` skill. See [SKILL.md](../SKILL.md).

## Jenkins

### Declarative Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent {
        docker {
            image 'node:20-alpine'
            args '-v /var/run/docker.sock:/var/run/docker.sock'
        }
    }

    environment {
        NODE_ENV = 'production'
        DOCKER_REGISTRY = 'ghcr.io'
        IMAGE_NAME = "${env.DOCKER_REGISTRY}/${env.GIT_ORG}/${env.GIT_REPO}"
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 1, unit: 'HOURS')
        timestamps()
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        returnStdout: true,
                        script: 'git rev-parse --short HEAD'
                    ).trim()
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }

        stage('Test') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        sh 'npm run test:unit -- --coverage'
                    }
                    post {
                        always {
                            junit 'test-results/unit/*.xml'
                            publishHTML([
                                reportDir: 'coverage',
                                reportFiles: 'index.html',
                                reportName: 'Coverage Report'
                            ])
                        }
                    }
                }

                stage('Integration Tests') {
                    steps {
                        sh 'npm run test:integration'
                    }
                    post {
                        always {
                            junit 'test-results/integration/*.xml'
                        }
                    }
                }
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
                archiveArtifacts artifacts: 'dist/**/*', fingerprint: true
            }
        }

        stage('Docker Build') {
            when {
                branch 'main'
            }
            steps {
                script {
                    docker.build("${env.IMAGE_NAME}:${env.GIT_COMMIT_SHORT}")
                }
            }
        }

        stage('Security Scan') {
            parallel {
                stage('Dependency Check') {
                    steps {
                        sh 'npm audit --audit-level=high'
                    }
                }

                stage('Container Scan') {
                    when {
                        branch 'main'
                    }
                    steps {
                        sh """
                            trivy image \
                                --severity HIGH,CRITICAL \
                                --exit-code 1 \
                                ${env.IMAGE_NAME}:${env.GIT_COMMIT_SHORT}
                        """
                    }
                }
            }
        }

        stage('Push Image') {
            when {
                branch 'main'
            }
            steps {
                script {
                    docker.withRegistry("https://${env.DOCKER_REGISTRY}", 'docker-credentials') {
                        docker.image("${env.IMAGE_NAME}:${env.GIT_COMMIT_SHORT}").push()
                        docker.image("${env.IMAGE_NAME}:${env.GIT_COMMIT_SHORT}").push('latest')
                    }
                }
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'main'
            }
            steps {
                script {
                    kubernetesDeploy(
                        configs: 'k8s/staging/*.yaml',
                        kubeconfigId: 'kubeconfig-staging'
                    )
                }
            }
        }

        stage('Smoke Tests') {
            when {
                branch 'main'
            }
            steps {
                sh 'npm run test:smoke -- --env=staging'
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            input {
                message 'Deploy to production?'
                ok 'Deploy'
            }
            steps {
                script {
                    kubernetesDeploy(
                        configs: 'k8s/production/*.yaml',
                        kubeconfigId: 'kubeconfig-production'
                    )
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            slackSend(
                color: 'good',
                message: "Build succeeded: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
            )
        }
        failure {
            slackSend(
                color: 'danger',
                message: "Build failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
            )
        }
    }
}
```

### Shared Library

```groovy
// vars/deployToKubernetes.groovy
def call(Map config) {
    def namespace = config.namespace
    def deployment = config.deployment
    def image = config.image

    sh """
        kubectl set image deployment/${deployment} \
            ${deployment}=${image} \
            -n ${namespace}

        kubectl rollout status deployment/${deployment} \
            -n ${namespace} \
            --timeout=5m
    """
}

// Usage in Jenkinsfile
@Library('shared-library') _

pipeline {
    stages {
        stage('Deploy') {
            steps {
                deployToKubernetes(
                    namespace: 'production',
                    deployment: 'web-app',
                    image: "${IMAGE_NAME}:${GIT_COMMIT_SHORT}"
                )
            }
        }
    }
}
```
