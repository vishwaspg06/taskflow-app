pipeline {
  agent { label 'taskflow-docker' }

  options {
    disableConcurrentBuilds()
    timeout(time: 20, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }

  environment {
    COMPOSE_PROJECT_NAME = 'taskflow-ci-tests'
  }

  stages {
    stage('Check tools') {
      steps {
        sh 'node --version && docker version && docker compose version'
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
          docker compose -f compose.ci.yaml exec -T db \
            psql -v ON_ERROR_STOP=1 -U taskflow_user -d taskflow -f /tmp/init.sql
        '''
      }
    }

    stage('API integration tests') {
      steps {
        sh '''
          docker compose -f compose.ci.yaml cp api/test/api.test.cjs api:/tmp/api.test.cjs
          docker compose -f compose.ci.yaml exec -T \
            -e TEST_BASE_URL=http://web api \
            node --test /tmp/api.test.cjs
        '''
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
