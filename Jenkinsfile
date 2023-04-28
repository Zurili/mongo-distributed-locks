@Library("pipeline-utils@master")
import com.reviewpro.*

gitPipelineUtils = new gitUtils()
npmPipelineUtils = new npmUtils()
tagPipelineUtils = new tagUtils()
rundeckPipelineUtils = new rundeckUtils()
notifierPipelineUtils = new notifierUtils()
dockerPipelineUtils = new dockerUtils()
helmPipelineUtils = new helmUtils()
dependencyCheckPipelineUtils = new dependencyCheckUtils()
sonarOwasp = new sonarqubeUtils()

def nextTag = ''

pipeline {
  agent any

  // parameters {
  //   booleanParam(name: 'CLOSE', defaultValue: false, description: 'Closing Release flag')
  //   // booleanParam(name: 'DEPS', defaultValue: true, description: 'Dependency Trigger flag')
  // }

  options {
    disableConcurrentBuilds()
    skipDefaultCheckout()
    skipStagesAfterUnstable()
  }

  // triggers {
  //   cron(env.BRANCH_NAME == "master" ? "@weekly" : "")
  // }

  stages {

    stage ('Checkout') {
      steps {
        checkout scm
        script {
          gitPipelineUtils.gitCheckout(env.BRANCH_NAME)
          nextTag = tagPipelineUtils.getNextReleaseTag()
        }
      }
    }

    stage ('Build') {
      steps {
        sh 'npm install'
      }
    }

    // stage ('Test') {
    //   when {expression { params.CLOSE == false }}
    //   steps {
    //     sh 'npm run coverage'
    //   }
    // }

    // stage ("OWASP dependency-check and Sonarqube analysis") {
    //   when {
    //     allOf {
    //       not { branch "hotfix-*"}
    //       expression { params.CLOSE == false }
    //     }
    //   }
    //   steps {
    //     script {
    //       dependencyCheckPipelineUtils.owaspDependencyCheck()
    //       dependencyCheckPipelineUtils.owaspDependencyCheckPublisher()
    //       sonarOwasp.sonarGeneric('emc-core')
    //     }
    //   }
    // }

    // stage ("Sonarqube Quality Gate") {
    //   when {
    //     allOf {
    //       not { branch "hotfix-*"}
    //       expression { params.CLOSE == false }
    //     }
    //   }
    //   steps {
    //     script {
    //       sonarOwasp.sonarQG()
    //     }
    //   }
    // }

    stage ('Publish') {
      when {
        branch 'master'
      }
      steps {
        script {
          npmPipelineUtils.publish(nextTag, true)
        }
      }
    }

    // stage('Trigger Dependencies') {
    //   when {
    //     allOf {
    //       branch 'master'
    //       expression { params.CLOSE == false }
    //       expression { params.DEPS == true }
    //     }
    //   }
    //   steps {
    //     build job: '../survey-components/master', wait: false
    //     build job: '../emc/master', wait: false
    //     build job: '../ui-settings-app/master', wait: false
    //   }
    // }

    stage ('Hotfix') {
      when {
        allOf {
          branch "hotfix-*"
          expression {
            env.BRANCH_NAME ==~ '^hotfix-[0-9]+\\.[0-9]+\\.[0-9]+\$'
          }
        }
      }
      steps {
        script {
          npmPipelineUtils.publishHotfix(env.BRANCH_NAME)
        }
      }
    }

  }

  post {
    success {
      script {
        if (currentBuild.previousBuild != null && currentBuild.previousBuild.result != 'SUCCESS') {
          notifierPipelineUtils.notifySuccess(currentBuild, env.BUILD_URL, "app@reviewpro.com", nextTag)
        }
        deleteDir()
      }
    }
    failure {
      script {
        notifierPipelineUtils.notifyError(currentBuild, env.BUILD_URL, "app@reviewpro.com", nextTag)
      }
    }
  }
}
