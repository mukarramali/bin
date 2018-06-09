webpackJsonp([0xea2911c54e62],{330:function(e,n){e.exports={data:{markdownRemark:{html:'<p>Unlike web deployments, android deployment still lacks the ease of version deployments. Specially when you don\'t want to use Play Store.</p>\n<p><img src="https://www.genymobile.com/wp-content/uploads/2015/07/Android-Docker.png" alt="alt text" title="Shipping Android Deployment"></p>\n<h3>Introduction</h3>\n<p>There will be five stages:</p>\n<ol>\n<li>Signing application</li>\n<li>Versioning of application. For that we gonna use git revision and Major.Minor.Patch naming convention.</li>\n<li>Building application using a docker. So that running environment doesn\'t change.</li>\n<li>Pushing new release to s3, while maintaining the previous versions.</li>\n<li>Pushing new tag to git, with the new version. So, we\'ll have tags for each version.</li>\n</ol>\n<p>Basically, we gonna use docker, git, and some simple hacks to put things in work. In the end, I\'ve shared a sample application.</p>\n<h3><em>Stage 1</em>: Signing Our Application</h3>\n<p>It\'s better to start thinking about security right from the big bang.\nFrom android studio, you can generate a new keystore, a jks file. <a href="https://developer.android.com/studio/publish/app-signing">Help?</a>\nCopy the keystore file details in a <em>config.yaml</em> file like below:</p>\n<pre><code class="language-yaml">key_store:\n  key: /xyz/xyz.jks\n  alias: key0\n  store_password: wuhoo\n  key_password: nibataunga\n</code></pre>\n<p>Studio will take care of signing, but to generate signed apk from command line, you\'ll need to make some changes in your build.gradle. The credentials we have put in above yaml file will be passed as command line args to gradle(Build stage[2]). </p>\n<pre><code class="language-groovy">android {\n    ...\n    signingConfigs {\n        release {\n            if (project.hasProperty(\'APP_RELEASE_STORE_FILE\')) {\n                storeFile file("$APP_RELEASE_STORE_FILE")\n                storePassword "$APP_RELEASE_STORE_PASSWORD"\n                keyAlias "$APP_RELEASE_KEY_ALIAS"\n                keyPassword "$APP_RELEASE_KEY_PASSWORD"\n            }\n        }\n    }\n    buildTypes {\n        release {\n          ...\n          if (project.hasProperty(\'APP_RELEASE_STORE_FILE\')) {\n              signingConfig signingConfigs.release\n          }\n        }\n    }\n}\n</code></pre>\n<h3><em>Stage 2</em>: Release Versioning, Digging Git</h3>\n<p>Let\'s follow the old school way.</p>\n<p>Major.Minor.<em>GitRevision</em>.Patch</p>\n<p>I won\'t go down the road to explain first two and the last one. Let\'s dig into GitRevision</p>\n<p>GitRevision will make versioning easy and consistent. It counts the number of commits from git, so you\'ll get incremental values everytime you release a new version.</p>\n<p>We\'ll put the below code in build.gradle[app]</p>\n<pre><code class="language-groovy">def getGitRevision = { ->\n    try {\n        def stdout = new ByteArrayOutputStream()\n        exec {\n            standardOutput = stdout\n            commandLine \'git\', \'rev-list\', \'--first-parent\', \'--count\', \'master\'\n        }\n        logger.info("Building revision #"+stdout)\n        return stdout.toString("ASCII").trim().toInteger()\n    }\n    catch (Exception e) {\n        e.printStackTrace();\n        return 0;\n    }\n}\n</code></pre>\n<p>And in build.gradle[app]</p>\n<pre><code class="language-groovy">    defaultConfig {\n        ...\n        versionCode = 10000000*majorVersion+10000*minorVersion + 10*revision\n        versionName = \'v\' + majorVersion + \'.\' + minorVersion + \'.\' + revision + patch\n    }\n</code></pre>\n<h3>Docker Image, Savage</h3>\n<p>We first need to build a docker image with minimum libraries and dependencies required.</p>\n<pre><code class="language-console">FROM openjdk:8\nRUN apt-get update\nRUN cd /opt/\nRUN wget -nc https://dl.google.com/android/repository/sdk-tools-linux-4333796.zip\nENV ANDROID_HOME /opt/android-sdk-linux\nRUN mkdir -p ${ANDROID_HOME}\nRUN unzip -n -d ${ANDROID_HOME} sdk-tools-linux-4333796.zip\nENV PATH ${PATH}:${ANDROID_HOME}/tools:${ANDROID_HOME}/tools/bin:${ANDROID_HOME}/platform-tools\nRUN yes | sdkmanager --licenses\nRUN yes | sdkmanager \\\n      "platform-tools" \\\n      "build-tools;27.0.3" \\\n      "platforms;android-27"\n\nRUN apt-get -y install ruby\nRUN gem install trollop\n</code></pre>\n<p>Trollop will be helpful in compile scripts, spicing the boring command line args.</p>\n<p>We are using openjdk as base image for java environment.\nWe have installed our sdk with version 27. You can change that accordingly.</p>\n<h4>Building the image:</h4>\n<pre><code class="language-console">docker build -t ${docker_image} -f ./scripts/Dockerfile .\n</code></pre>\n<p>Or you can directly pull my latest base image.</p>\n<pre><code class="language-console">docker pull mukarramali98/androidbase\n</code></pre>\n<h3>Docker container on the way</h3>\n<p>To automate the process, let\'s dig into a small script:</p>\n<pre><code class="language-console">#!/usr/bin/env bash\nset -xeuo pipefail\n\napp_name=xyz\ncontainer_name=androidcontainer\n\nif [ ! "$(docker ps -q -f name=${container_name})" ]; then\n    if [ "$(docker ps -aq -f status=exited -f name=${container_name})" ]; then\n        # cleanup\n        docker rm $container_name\n    fi\n    # run your container\n    docker run -v ${PWD}:/${app_name}/ --name ${container_name} -w /${app_name} -d -i -t mukarramali98/androidbase\nfi\n\ndocker exec ${container_name} ruby /${app_name}/scripts/compile.rb -k /${app_name}/config.yaml\n</code></pre>\n<p>Here we first check if the container already exists. And then create accordingly.\nWhile creating the container, we <em>mount</em> our current project directory. So next time we run this container, our updated project will already be there in the container.</p>\n<h3><em>Stage 3</em>: Running container, <em>Build Stage</em></h3>\n<p>We run the container, with our compile script. Passing the signing config file we created earlier.</p>\n<pre><code class="language-ruby">config = YAML.load_file(key_config_file)\n\nkey_store = config[\'key_store\']\noutput_file = \'app/build/outputs/apk/release/app-release.apk\'\n`rm #{output_file}` if File.exists?output_file\n\nputs `#{File.dirname(__FILE__)}/../gradlew assembleRelease --stacktrace \\\n    -PAPP_RELEASE_STORE_FILE=#{key_store[\'key\']} \\\n    -PAPP_RELEASE_KEY_ALIAS=#{key_store[\'alias\']} \\\n    -PAPP_RELEASE_STORE_PASSWORD=\'#{key_store[\'store_password\']}\' \\\n    -PAPP_RELEASE_KEY_PASSWORD=\'#{key_store[\'key_password\']}\'`\n</code></pre>\n<h3><em>Stage 4</em>: Pushing to S3</h3>\n<p>So, now we have build a signed apk from a docker container. It\'s time to push them.\nConnect with your s3 bucket and generate <em>$HOME/.s3cfg</em> file, and pass it to ruby script below:</p>\n<pre><code class="language-ruby">if File.file?(s3_config)\n  # Push the generate apk file with the app and version name\n  `s3cmd put app/build/outputs/apk/release/app-release.apk s3://#{bucket}/#{app_name}-#{version_name}.apk -m application/vnd.android.package-archive -f -P -c #{s3_config}`\n  # application/vnd.android.package-archive is an apk file format descriptor\n\n  # Replace the previous production file\n  `s3cmd put app/build/outputs/apk/release/app-release.apk s3://#{bucket}/#{app_name}.apk -m application/vnd.android.package-archive -f -P -c #{s3_config}`\n\n  # To keep the track of latest release\n  `echo #{version_code}> latest_version.txt`\n  `s3cmd put latest_version.txt s3://#{bucket}/latest_version.txt -f -P -c #{s3_config}`\n  `rm latest_version.txt`\n  puts "Successfully released new app version."\nend\n</code></pre>\n<p><code>application/vnd.android.package-archive</code> is the apk file type descriptor.</p>\n<h3><em>Stage 5</em>: Finally, Git Tagging The New Release Version, <em>#hashtag</em></h3>\n<pre><code class="language-ruby">def push_new_tag version_name\n  `git tag #{version_name}`\n  `git push origin #{version_name}`\n  puts "New tag pushed to repo."\nend\n</code></pre>\n<h3><a href="https://github.com/mukarramali/android_deployment_example">Demo Application</a></h3>\n<p>Releasing soon.</p>',frontmatter:{date:"June 06, 2018",path:"/android-deployment",title:"Android Versioning Using Docker & Git Like A Pro"}}},pathContext:{}}}});
//# sourceMappingURL=path---android-deployment-355ef9305366d6acb6a8.js.map