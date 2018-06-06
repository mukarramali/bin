---
path: "/android-deployment"
date: "2018-06-06T00:08:33.962Z"
title: "Android Versioning Using Docker Like A Pro"
---

Believe it or not, unlike web deployments, android deployment sucks. Specially when you don't want to use Play Store.

So, we gonna use docker, git, and some simple hacks to put things in work

### Docker Image, Savage

We first need to build a docker image with minimum libraries and dependencies required.

```console
FROM openjdk:8
RUN apt-get update
ENV PWD /opt/
RUN cd ${PWD}
RUN wget -nc https://dl.google.com/android/repository/sdk-tools-linux-4333796.zip
ENV ANDROID_HOME /opt/android-sdk-linux
RUN mkdir -p ${ANDROID_HOME}
RUN unzip -n -d ${ANDROID_HOME} sdk-tools-linux-4333796.zip
ENV PATH ${PATH}:${ANDROID_HOME}/tools:${ANDROID_HOME}/tools/bin:${ANDROID_HOME}/platform-tools
RUN yes | sdkmanager --licenses
RUN yes | sdkmanager \
      "platform-tools" \
      "build-tools;27.0.3" \
      "platforms;android-27"

RUN apt-get -y install ruby
RUN gem install trollop
```
Trollop will be helpful in compile scripts, spicing the boring command line args.

We are using openjdk as base image for java environment.
We have installed our sdk with version 27. You can change that accordingly.


#### Building the image:
```console
docker build -t ${docker_image} -f ./scripts/Dockerfile .
```

Or you can directly pull my latest base image.
```console
docker pull mukarramali98/androidbase
```



### Docker container on the way

To automate the process, let's dig into a small script:

```console
#!/usr/bin/env bash
set -xeuo pipefail

app_name=xyz
container_name=androidcontainer

if [ ! "$(docker ps -q -f name=${container_name})" ]; then
    if [ "$(docker ps -aq -f status=exited -f name=${container_name})" ]; then
        # cleanup
        docker rm $container_name
    fi
    # run your container
    docker run -v ${PWD}:/${app_name}/ --name ${container_name} -w /${app_name} -d -i -t mukarramali98/androidbase
fi

docker exec ${container_name} ruby /${app_name}/scripts/compile.rb -k /${app_name}/config.yaml
```

Here we first check if the container already exists. And then create accordingly.
While creating the container, we *mount* our current project directory. So next time we run this container, our updated project will already be there in the container.


##### Running container

In the last line of the script we run the container, with our compile script. Passing the config(Application configurations) file. We'll get to know about this compiling stage below.




### Signing Our Application

It's better to start thinking about security right from the big bang.
From android studio, you can generate a new keystore, a jks file. [Help?](https://developer.android.com/studio/publish/app-signing)
Copy the keystore file details in a *config.yaml* file like below:

```yaml
key_store:
  key: /xyz/xyz.jks
  alias: key0
  store_password: wuhoo
  key_password: nibataunga
```
Studio will take care of signing, but to generate signed apk from command line, you'll need to make some changes in your build.gradle. See my sample project for help.




### Release Versioning, Digging Git 

Let's follow the old school way.

Major.Minor.*GitRevision*.Patch

I won't go down the road to explain first two and the last one. Let's dig into GitRevision

GitRevision will make versioning easy and consistent. It counts the number of commits from git, so you'll get incremental values everytime you release a new version.

We'll put the below code in build.gradle[app]
```groovy
def getGitRevision = { ->
    try {
        def stdout = new ByteArrayOutputStream()
        exec {
            standardOutput = stdout
            commandLine 'git', 'rev-list', '--first-parent', '--count', 'master'
        }
        logger.info("Building revision #"+stdout)
        return stdout.toString("ASCII").trim().toInteger()
    }
    catch (Exception e) {
        e.printStackTrace();
        return 0;
    }
}
```



### Pushing to S3

So, now we have build a signed apk from a docker container. It's time to push them.
Connect with your s3 bucket and generate *$HOME/.s3cfg* file, and pass it to ruby script below:

```ruby
if File.file?(s3_config)
  # Push the generate apk file with the app and version name
  `s3cmd put app/build/outputs/apk/release/app-release.apk s3://#{bucket}/#{app_name}-#{version_name}.apk -m application/vnd.android.package-archive -f -P -c #{s3_config}`
  # application/vnd.android.package-archive is an apk file format descriptor

  # Replace the previous production file
  `s3cmd put app/build/outputs/apk/release/app-release.apk s3://#{bucket}/#{app_name}.apk -m application/vnd.android.package-archive -f -P -c #{s3_config}`

  # To keep the track of latest release
  `echo #{version_code}> latest_version.txt`
  `s3cmd put latest_version.txt s3://#{bucket}/latest_version.txt -f -P -c #{s3_config}`
  `rm latest_version.txt`
  puts "Successfully released new app version."
end
```



### Finally, Git Tagging The New Release Version, *#hashtag*

```ruby
def push_new_tag version_name
  `git tag #{version_name}`
  `git push origin #{version_name}`
  puts "New tag pushed to repo."
end
```



### [Demo Application](https://github.com/mukarramali/bin)
