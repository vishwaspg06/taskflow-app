pipeline {
  agent { label 'taskflow-docker' }

  options {
    disableConcurrentBuilds()
    timeout(time: 20, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }

  environment {
    COMPOSE_PROJECT_NAME = 'taskflow-ci-tests'
    REGISTRY = '323230574799.dkr.ecr.ap-south-1.amazonaws.com'
    DEPLOY_HOST = '43.204.36.110'
  }

  stages {
    stage('Check tools') {
      steps {
        sh 'node --version && docker version && docker compose version'
        script {
          env.RELEASE_TAG = "build-${env.BUILD_NUMBER}-" +
            sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
        }
      }
    }

    stage('Frontend checks') {
      steps {
        dir('web') {
          sh 'npm ci && npm run lint && npm run build'
        }
      }
    }

    stage('Build images') {
      steps {
        sh 'docker build -t taskflow-api:ci ./api'
        sh 'docker build -t taskflow-web:ci ./web'
      }
    }

    stage('Start test stack') {
      steps {
        sh '''
          docker compose -f compose.ci.yaml up -d --wait
          docker compose -f compose.ci.yaml cp db/init.sql db:/tmp/init.sql
          docker compose -f compose.ci.yaml exec -T db psql -v ON_ERROR_STOP=1 -U taskflow_user -d taskflow -f /tmp/init.sql
        '''
      }
    }

    stage('API integration tests') {
      steps {
        sh '''
          docker compose -f compose.ci.yaml cp api/test/api.test.cjs api:/tmp/api.test.cjs
          docker compose -f compose.ci.yaml exec -T -e TEST_BASE_URL=http://web api node --test /tmp/api.test.cjs
        '''
      }
    }

    stage('Publish to ECR') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'taskflow-aws-ecr',
          usernameVariable: 'AWS_ACCESS_KEY_ID',
          passwordVariable: 'AWS_SECRET_ACCESS_KEY'
        )]) {
          sh '''
            set +x
            export AWS_DEFAULT_REGION=ap-south-1
            export DOCKER_CONFIG="$(mktemp -d)"
            trap 'rm -rf "$DOCKER_CONFIG"' EXIT
            aws ecr get-login-password |
              docker login --username AWS --password-stdin "$REGISTRY"
            docker tag taskflow-api:ci "$REGISTRY/taskflow-api:$RELEASE_TAG"
            docker tag taskflow-web:ci "$REGISTRY/taskflow-web:$RELEASE_TAG"
            docker push "$REGISTRY/taskflow-api:$RELEASE_TAG"
            docker push "$REGISTRY/taskflow-web:$RELEASE_TAG"
          '''
        }
      }
    }

    stage('Deploy to EC2') {
      steps {
        withCredentials([sshUserPrivateKey(
          credentialsId: 'taskflow-ec2-ssh',
          keyFileVariable: 'SSH_KEY',
          usernameVariable: 'SSH_USER'
        )]) {
          sh '''
            set +x
            sed -i 's/\\r$//' deploy/remote.sh deploy/init-db.sh
            scp -i "$SSH_KEY" \
              -o StrictHostKeyChecking=yes \
              -o UserKnownHostsFile="$WORKSPACE/deploy/known_hosts" \
              deploy/compose.yaml deploy/init-db.sh deploy/remote.sh \
              "$SSH_USER@$DEPLOY_HOST:/opt/taskflow/"
            ssh -i "$SSH_KEY" \
              -o StrictHostKeyChecking=yes \
              -o UserKnownHostsFile="$WORKSPACE/deploy/known_hosts" \
              "$SSH_USER@$DEPLOY_HOST" \
              "bash /opt/taskflow/remote.sh $RELEASE_TAG"
          '''
        }
      }
    }
  }

  post {
    failure {
      sh 'docker compose -f compose.ci.yaml logs --tail 60'
    }
    always {
      sh 'docker compose -f compose.ci.yaml down -v --remove-orphans'
    }
  }
}
