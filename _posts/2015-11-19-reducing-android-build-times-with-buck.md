---
layout: post
title: Reducing Android Build Times with Buck
author: AnthonyUccello
meta: How PumpUp setup Buck for Android; reducing compile times from 3 minutes to 10 seconds.
---

1. [Intro](#intro)
2. [Setup](#setup)
3. [Library Build Rules](#library-build-rules)
4. [Coding Library Rules For Library Projects](#coding-library-rules-for-library-projects)
5. [External Libraries](#external-libraries)
6. [Exopackage](#exopackage)
7. [Binary Rules](#binary-rules)
8. [Completed Buck Files](#completed-buck-files)
9. [Errors](#errors)

### Intro

#### Preface

This post will demonstrate how I set up Buck & Exopackage for PumpUp. It will also troubleshoot the errors that came up. Setting up Buck brought our build times down from 3 minutes to 10 seconds. [Click here](#completed-buck-files) if you want to look at the completed build scripts. Note: Because most of our codebase is JavaScript, I used just one `BUCK` file and some convenience dependencies in a `BuckConstants` file. For the absolute best results, you should use multiple `BUCK` files and declare dependencies independently. Extra special thanks to [Shawn Wilsher](https://github.com/sdwilsh) for all the Buck help!

<img center src='/media/frymeme.jpg' />

Setting up Buck can be a little intimidating if you don't know Regex or Python. Stick with it— it's well worth the time you will save! This post will assume that you have absolutely no knowledge Python or Regex.  I'll explain every step I took to getting Buck working.

Say you save 2 minutes off of your build time and you have 10 engineers who compile 20 times a day for 1 year. You would save 100 days of time! I think we can agree that this is a no brainer!

##### And last but not least...

<img center src='/media/youmean.jpeg' />

If you've spent some time coding on Android, you may have encountered the nasty [65536 code limit](http://developer.android.com/intl/es/tools/building/multidex.html). Adding the Google Play Services library will likely shove you right over that limit. Buck is multi-dexed, so you will never have to worry about this issue.

At the end of this post, I listed a bunch of errors that I ran into. Some of these errors — especially the last few  — are pretty specific to this project (for instance, the missing .so library issue I had with CrossWalk). You may find this resource quite helpful, just in case you encounter any problems.

PumpUp uses Cordova, CrossWalk, and a number of other libraries.

For official documentation and tutorials visit the [Buck page](https://buckbuild.com/).

This post will assume starting point from the Buck setup using their [quick start guide](https://buckbuild.com/setup/quick_start.html) and that you know how to add the [keystore](https://buckbuild.com/rule/keystore.html) rule (I won't be mentioning this later). You should know how to use terminal and it is assumed that you understand that all Buck commands are being run from my local Android project directory, and Buck has already been [added to my path](https://buckbuild.com/setup/install.html).

Here is the project structure I am converting over to build with Buck:

<img center src='/media/proj.png' />

### Buck Basics

#### What Is Buck?

Buck is a tool that allows you to build your Android project with greater speed. It saves time by building resources in parallel and by caching things that are already built and don't need to be rebuilt.

#### What Is Exopackage?

Exopackage makes incremental builds up to 5X faster. Exopackage speeds up your builds, but it requires a little extra set up involving an AppShell. Basically, it’s Buck on crack.

#### What is buckd/Watchman?

buckd uses Watchman to speed up your builds. The time spent parsing BUCK files will go away and JVM cache will be warm so recompiles will be faster. If you use hg, Facebook has made it much faster with Watchman integration.

[Get it here](https://facebook.github.io/watchman/docs/install.html)

Super easy. buckd is basically Exopackage on crack.

#### Build File v.s. Build Rule v.s. Build Target

A [build file](https://buckbuild.com/concept/build_file.html) is a BUCK file. It has ownership of all files in its directory and subdirectories, unless any of those sub-directories has a BUCK file. If that's the case, it has ownership of that directory and subdirectories.

A [build rule](https://buckbuild.com/concept/build_rule.html) is a rule that will generate 0 or 1 file. You will put your build rules inside BUCK files. You will need specialized build rules for each of the output files you make. The most common ones are [android_library](https://buckbuild.com/rule/android_library.html) and [android_resource](https://buckbuild.com/rule/android_resource.html).

A [build target](https://buckbuild.com/concept/build_target.html) is the addressable target of a build rule. When you make a build rule, it ALWAYS has a name. This name is used when other rules need to depend on this rule. When a build rule depends on another, it uses ‘:build-rule-name’ (which is the build target).

<img center src='/media/build.png' />

#### All Files Must Live Under The Project Root

With Gradle, you can have external dependencies. These are the things you added to your `build.gradle` file.

With Buck, all necessary files need to live under the project root. This is also where the `.buckconfig` is.

This means I will need to get the external files to reside locally in the project. But I’ll come back to this in the next section.

For now let's start with the...

### Setup

#### Buck Setup

The first step was putting `.buckconfig` in the project root (which you should have from the [quickstart](https://buckbuild.com/setup/quick_start.html)). You can add more config options [outlined here](https://buckbuild.com/concept/buckconfig.html#project).

```python
[alias]
    pumpup = //:pumpup
[java]
    src_roots = /src
[project]
    default_android_manifest = AndroidManifest.xml
    ignore = .git
    temp_files = ^#.*#$, .*~$, .*\.swp$
[android]
    target = Google Inc.:Google APIs:23
[project]
  watchman_query_timeout_ms = 3000
```

and updating the `.ignore` (because you use Github right?)

```
app/platforms/android/buck-out
app/platforms/android/.buckd
app/platforms/android/buck-
app/platforms/android/buck-cache
```

The `[alias]` tag will let me build the `.apk` with a simple `buck build pumpup` call in the terminal. This will make Buck start the `pumpup` rule which is (as I mentioned before) the name of my [android_binary](https://buckbuild.com/rule/android_binary.html) rule. Because the `android_binary` rule will depend on all the other rules, Buck then goes and runs through all the build rules in the file. But I'm getting WAY ahead of the curve. Let's step back and start with some...

##### Python Swag

To keep the BUCK build file as small and readable as possible, I am using constants from a `BuckConstants` file. In Python, you can pass a dictionary object as a params object for a function using `**`. You can read up on what ** does [here](http://programmers.stackexchange.com/questions/131403/what-is-the-name-of-in-Python):

So I added the `BuckConstants` file in the same directory. For now, it's blank.

Next, I imported it into the BUCK file using [include_defs](https://buckbuild.com/function/include_defs.html).

To fetch all the `.jar` and `.java` files, a little regex is used. `import re` needs to be added to the `BUCK` file.

Right now, the `BUCK` file looks like this:

```python
import re
include_defs('//BuckConstants')
```

And the `BuckConstants` file is empty. That will change soon, but first...

### Library Build Rules

<img center src='/media/yodawgmeme.jpg' />

#### The Library Term

We should be clear about the term library. The [android_library](https://buckbuild.com/rule/android_library.html) rule will be used for the following:

1. .jar files & .aar files (prebuilt_jar or android_prebuilt_aar needs to be used first!)
2. Library Projects
3. .java files
4. .aar files
5. AppShell (this is for Exopackage)
6. The `src`, `res` and `assets` folders (you know all the code you wrote and the resources you used)

All of my .java files will be converted to a library, and the `res` and `assets` folder will be created with an [android_resource](https://buckbuild.com/rule/android_resource.html) rule (just like I did for the external libraries and library projects). As a reminder, the `android_library` rule will depend on the `android_resouce` rule. Which makes sense, as we need our resources and assets along with the `.java` code to run! The `android_resource rule` covers the `res, `assets`, and the `package name`.

The important take away with Buck is that you are turning your `.java` code & resources & assets into a library using the `android_library rule` & `android_resource` rule. All of this will eventually be compiled into the [android_binary](https://buckbuild.com/rule/android_binary.html). Before I cover `.java`, I will go over `.jars` because those will need to be compiled first.

#### Coding Library Rules For .jars

You might be thinking that it's time to use `android_library` for `.jars`, since `.jars` are libraries — aren’t they!? Correct...but you will often need to use `android_library` and `android_resouce` together, because a library will usually have src/res/asset files. If a library is a `.jar` file, you first use `prebuilt_jar` and then `android_library` which will depend on it (with the `exported_deps` arg): you can think of this as a special rule. It can be a little confusing, so keep this in mind.

One thing to note about `exported deps` is that it can slow down your build and you only want to use it when you inherit from a class or return/throw something in another jar in your code.

Here is the long way to write out the `prebuilt_jar` rule.

```python
prebuilt_jar(
  name = 'xwalk-app-jar',
  binary_jar = 'xwalk_core_library/libs/xwalk_core_library_java_app_part.jar',
)
```

The `name` is the name of this build rule that will be referenced when other rules (like the upcoming `android_library` rule) depend on it via `deps = [‘:xwalk-app-jar’]`. The `binary_jar` is the local path to the jar file (tip: you can drag the file into terminal to get a quick path to it).

If you have `.aar` files, you use the `android_aar` rule (I don’t have any .aar files for this project). You would do the same as above, but use the `android_prebuilt_aar` rule instead of `prebuilt_jar` followed by the `android_library` rule (with the `eported_deps` arg). [.aar](http://tools.android.com/tech-docs/new-build-system/aar-format) files are libraries that are bundled with res, src, and assets (and more, just like a Library Project) but it's a nice convient zip of type .aar. It's like a `.jar`, but with extra stuff. The rule  `android_prebuilt_aar` has the word android_ in front because it ONLY works with `android_library`, where as `prebuilt_jar` will work with both `android_library` and `java_library` rules.

Just a note: this is a preview of the `prebuilt_jar` rule, because I am going to compile the .jar files in the /libs folder first.  I will be using regex and a loop to do it, so I figured I'd show you the 'normal' way of adding any jar. Technically, you can add all your jars this way, but why hard code when you can regex?

That's a really short and easy rule, but the BUCK file can get very messy very fast. This is why we are going to start with some clean coding techniques right off the bat. I found that it helps to write things in the order that they will be compiled. I prefer to structure it so that build rules lower in the script will rely on build rules above it. Again, it's my personal preference - but it made everything a lot easier for me.

Buck uses Python, but even if you don’t know any Python (like me), don’t fret. You can easily tell what’s going on. The thing to keep in mind with Python is that it is a space separated language. You can put named arguments in any order!

Rather than writing a build rule for everything, we are going to create a dictionary object, and then loop that calling prebuilt_jar on every object inside it.

Here is the libs folder in the project:

<img center src='/media/libs.png' />

I am going to use the `prebuilt_jar` rule for all these, but it's important to note that these aren’t ALL our .jar files. One of our Library Projects has .jar files, which we will deal with later in the External Libraries section.

This brings in Regex. If you don’t know Regex, check out this [tutorial](https://www.youtube.com/watch?v=EkluES9Rvak). It's really good to know, but if you’re in a hurry, use the syntax here.

First to the BUCK file (for now) I add:

```python
JAR_DEPS = []
```

Next, I am going to add all the .jar files from the libs folder.

<img center src='/media/compilememe.jpeg' />

```python
#### Build rules for every .jar in the /libs folder.
for jarfile in glob(['libs/*.jar']):
  name = 'jars__' + re.sub(r'^.*/([^/]+)\.jar$', r'\1', jarfile)
  jar_deps.append(':' + name)
  prebuilt_jar(
    name = name,
    binary_jar = jarfile,
  )
```

This is looping the libs folder and getting every `.jar` file. It's then appending the name of it (i.e. build target) to the JAR_DEPS (that's why it's called `JAR_DEPS` because this is an array of build rule names, which will become build targets that others rules depend on), and then calling the `prebuilt_jar` rule on it.

The regex here is basically getting the name of the jar (e.g. gcm.jar) and creating a name (build target identifier) for it (.e.g jars__gcm). To see for yourself, you can check the goings-on inside the `buck-out/gen` folder when you do buck builds (here's a snippet of what might you will find below). This is what your build rules are generating!

<img center src='/media/buckout.png' />

`glob` does what you expect. It gets all the matching files in that directory.

Our current built script looks like this:

```python
import re

# ALL jars are handled up here.

JAR_DEPS = []

#### Build rules for every .jar in the /libs folder.
for jarfile in glob(['libs/*.jar']):
  name = 'jars__' + re.sub(r'^.*/([^/]+)\.jar$', r'\1', jarfile)
  JAR_DEPS.append(':' + name)
  prebuilt_jar(
    name = name,
    binary_jar = jarfile,
  )
```

This grabs all the .jar files in our libs folder and generates a name for it. It then adds the name to the JAR_DEPS array. Next, it creates the `prebuilt_jar`. This JAR_DEPS array is a list of `build targets` that we will use as a dependency later. Basically, it tells Buck that we require these files to be compiled first.

To check that everything is going well, I would run `buck build pumpup` every time I add or change something. You should do the same as you set up your project!

There is still more to do. Now it's time for...

### Coding Library Rules For Library Projects

### Crosswalk Library Project

Since I have the libs folder taken care of, it's time to tackle the Library Projects.

Let's take a look at at a Library Project Xwalk:

<img center src='/media/xwalk.png' />

Library Projects can have their own src, libraries, assets, and res folders. As with the main application code and resources/assets, I need to do the same for the external libraries (I'll cover this later). Before, it was easy to just use the `prebuilt_jar` rule ( I didn't put them into a android_library rule yet - I'll need to do that, but I am going to get all `.jars` first!). These libraries have a source code, libraries of their own, resources, and assets! That means these libraries will need to depend (`dep`) on some `android_resource` rules.

This is the Library Project xwalk_core_library. Notice how it has a `libs` folder with `.jar` files of its own. It also has an `src` folder (which could have `.java` code, but in this case it does not). It also has a special `.so` (shared object, c++, Library, I will come back to that later). It also has its own `AndroidManifest.xml`, which is where I will get the package name from. It also has things we are going to completely ignore: `build.gradle`, `xwalk_core_library.iml`, and the `build` folder.

Let's start with what we already know. Those two jar files look awfully familiar. Oh right, they're just like the `.jars` we have in our libs folder. I need to add the build rules for these. I also need to make sure the `android_library` rule for this will depend on the `android_resource` rule.

This is why I choose to use a parse object (i.e. dictionary) that will contain all of the data needed to call the `prebuilt_jar`, `android_resource`, and `android_library` rules in a loop, each depending on the previous one. This way, I have one place to put ALL .jar files (technically, we could add the .jar files from our libs folder this way). Depending on your project, you might be better off explicitly declaring dependencies and having your own build order. I didn't notice any slow down, so I was happy to do it this way (if you find that your builds are slower, consider splitting your code into mulitple buck files and ditching the convienience dependencies).

I added this to the `BuckConstants` file.

```python
# Build rules for every .jar not in the libs folder
PREBUILT_JARS = [
  {'name' : 'xwalk-app-jar', 'binary_jar' : 'xwalk_core_library/libs/xwalk_core_library_java_app_part.jar'},
  {'name' : 'xwalk-library-jar', 'binary_jar' : 'xwalk_core_library/libs/xwalk_core_library_java_library_part.jar'},
]
```

`PREBUILT_JARS` is where I will add all `.jar` objects that aren't in the `libs` folder. This covers the library projects and external libraries which are going to have jars.

As you can see, I created a dictionary that has the name and path for the two jar files. This will be passed later to the `prebuilt_jar` rule in a loop that builds all of these and combines them from the ones I built from the `libs` folder to make one convienient android_library named "all-jars". This will make it easy for the `android_resource` rule to depend on this, and later the final application `android_library` to depend on it as well. I will do the same thing with the `android_resource` rules and the `android_library rules.

Now, I will create a loop that will go over each of these objects and call the `prebuilt_jar` rule on them in the `BUCK` file by adding

```python
#### Calls prebuilt_jar for each object in PREBUILT_JARS.
for pJar in PREBUILT_JARS:
  prebuilt_jar(
    name = pJar['name'],
    binary_jar = pJar['binary_jar'],
  )
  JAR_DEPS.append(':' + pJar['name'])
```

After I create the jars, I also append the name (which will be its build target) to the `JAR_DEPS` array (with the `:`, which is used as the target identifer tag). This will make it easy for the main application `android_library` rule to depend on only one 'jars' rule later on (instead of keeping track of each binary rule individually, I can just pass this deps array).

But I still need an `android_library` rule to compile all these `.jar` files as a library (including the ones I added from the `libs` folder). I will create that rule now.

```python
#### Combines all jars into 1 library file.
android_library(
  name = 'all-jars',
  exported_deps = JAR_DEPS,
)
```

I will short form that code later (by passing the arguments as a dictionary and using **).

Remember the `JAR_DEPS` that I was adding all the names to from all the `PREBUILT_JARS`? Here, I am creating an `android_library` and I'm passing the build targets from all those `prebuilt_jars`.

I'm taking all the `.jars` from the `libs` folder and all the `.jars` that are in the library projects and putting all of them into one dependency array, `JAR_DEPS`, to make one dependency for all the `.jar` files. What's nice is that now, any time I want to add a `.jar` file, all I do is add it to the appropriate dictionary object in the `BuckConstants` file (which I will be doing a lot of next).

Let's take a look at everything in the BUCK file till now:

```python
import re
include_defs('//BuckConstants')
# ALL jars are handled up here.

JAR_DEPS = []

#### Build rules for every .jar in the /libs folder.
for jarfile in glob(['libs/*.jar']):
  name = 'jars__' + re.sub(r'^.*/([^/]+)\.jar$', r'\1', jarfile)
  prebuilt_jar(
    name = name,
    binary_jar = jarfile,
  )
  JAR_DEPS.append(':' + name)


#### Build rules for every .jar in the /ExternalLibraries folder. Add prebuilt jar rules here.
PREBUIT_JARS = [
  {'name' : 'xwalk-app-jar', 'binary_jar' : 'xwalk_core_library/libs/xwalk_core_library_java_app_part.jar'},
  {'name' : 'xwalk-library-jar', 'binary_jar' : 'xwalk_core_library/libs/xwalk_core_library_java_library_part.jar'},
]

#### Calls prebuilt_jar for each object in prebuilt_jars.
for pJar in prebuilt_jars:
  prebuilt_jar(
    name = pJar['name'],
    binary_jar = pJar['binary_jar'],
  )
  JAR_DEPS.append(':' + pJar['name'])

#### Combines all jars into 1 library file. Res is not specified here because its handled by the individual lib rules later
android_library(
  name = 'all-jars',
  exported_deps = jar_deps,
)
```

Now it's time to use the ** rule I mentioned earlier. In the `BuckConstants` file, I add (also note I moved `JAR_DEPS` to here as well):

```python
JAR_DEPS = []

ALL_JARS_PARAMS = {'name':'all-jars', 'exported_deps':JAR_DEPS}
```

This will now let me change this rule in the `BUCK` file

```python
android_library(
  name = 'all-jars',
  exported_deps = jar_deps,
)
```

to


```python
#### Combines all jars into 1 library rule. This is a convienience dependency
android_library(**ALL_JARS_PARAMS)
```

Cool. That's one part down . There's more to compile for this library project so I need to include some more rules. This library project has a `res` folder (which is under `src`). That means we need an `android_resource` rule. An `android_library` rule I am going to make later is going to depend on this.

In the `BuckConstants` file, I add

```python
RESOURCES = [
  {'name':'xwalk-lib-res', 'package':'org.xwalk.core','res':'xwalk_core_library/src/main/res', 'assets':None},
]
```

I got the package name by opening the `AndroidManifest.xml` (the CrossWalk one) and by looking at the `package` tag. The `res` directory is the local path to the res folder.

`RESOURCES` is where I am going to add all resources from now on. In the `BUCK` file I will loop all objects inside `RESOURCES` and call `android_resource` on it. That's why I added the following to the BUCK file:

```python
#### Builds android_resource for each resource in resources.
for resource in RESOURCES:
  android_resource(name = resource['name'], package = resource['package'], res = resource['res'], assets = resource['assets'])
```

So that covers the resources for this library, but I still need an actual `android_library` rule that will take the `.jars`, `.java` (if there was any), `res`, and `assets`.

For that, I am going to create another parse object in the `BuckConstants` (because when I add the next library project, I can also add what's needed to the RESOURCES and LIBRARIES arrays).

```python
LIBRARIES = [
  {'name':'xwalk-lib','deps':[':all-jars', ':xwalk-lib-res'], 'srcs':['xwalk_core_library/src/**/*.java']},
]
```

Then, in the `BUCK` file, I need to go through all the `LIBRARIES` objects and call `android_library` on it, so to `BUCK` I add:

```python
#### glob can't be set in the constants file, so we glob here else: AssertionError: Cannot use `glob()` at the top-level of an included file.
for library in LIBRARIES:
  library['srcs']= glob(library['srcs'])
  android_library(name = library['name'],deps = library['deps'],srcs = library['srcs'])
  LIB_DEPS.append(':' + library['name'])
```

Now one thing you might notice is the step here:

`library['srcs'] = glob(library['srcs'])`

I can't call glob() in the constants file (since it's a `def` file), so I actually need to call glob in the BUCK file. The long way of this rule would be:

```
android_library(
  name = 'main-lib',
  srcs = glob(['xwalk_core_library/src/**/*.java'],
  deps =[
    ':all-jars',
    ':xwalk-lib-res',
  ]
)
```

Notice how this library file depends on the `xwalk-lib-res` AND `all-jars`? That's because earlier, we grabbed the `.jar` files (remember the `PREBUIT_JARS` in `BuckConstants` and the loop in the `BUCK` file that calls `prebuilt_jar`) and bundled all its resoures and assets (with `RESOURCES` and the loop in the `BUCK` file that builds all of them with `android_resource`). This library project has been set up. Since I made all those parser objects in my `BuckConstants` and loops that handle them (by calling the appropriate build rule) in the `BUCK` file, adding another library project (and later the external libraries) will be very easy.

<img center src='/media/cordovalib.png' />

This is the CordovaLib Library Project. This one does have `.java `files under the `src` folder, but it doesn't have any libraries (`.jars`) of its own.

We will ignore the `test` and `build` folders, and all the `.xml` and `gradle` files. We only care about the `assets`, `res`, `src` folders.

All I need to do is update the `RESOURCES` object with the values needed, and update the `LIBRARIES` object to build this.

Here are the relevant updates to the `BuckConstants` file

```python
RESOURCES = [
  {'name' : 'xwalk-lib-res', 'package' : 'org.xwalk.core', 'res' : 'xwalk_core_library/src/main/res', 'assets' : None},
  {'name':'cordova-lib-res', 'package':'org.apache.cordova','res':'CordovaLib/res', 'assets':'CordovaLib/assets'},
]

LIBRARIES = [
  {'name' : 'xwalk-lib', 'deps' : [':all-jars', ':xwalk-lib-res'], 'srcs' : ['xwalk_core_library/src/**/*.java']},
  {'name' : 'cordova-lib', 'deps' : [':all-jars', ':cordova-lib-res'], 'srcs' : ['CordovaLib/src/**/*.java']},
]
```

There is one more trick for this. It actually has an `.so` library, so I needed to add it using the [prebuilt_native_library](https://buckbuild.com/rule/prebuilt_native_library.html) rule (man, Buck takes care of everything!). So to `BuckConstants`, I added:

```python
PREBUILT_NATIVE_LIBARY_PARAMS = {'name':'native_libs', 'native_libs':'xwalk_core_library/src/main/jniLibs'}
```

and to the `BUCK` file, I added:

```python
prebuilt_native_library(**PREBUILT_NATIVE_LIBARY_PARAMS)
```

Last but not least, I insert the Facebook plugin. It was special because it requires the [android_build_config]() rule, so I added that rule as well. To add this plugin, I add this to `PREBUILT_JARS`

```python
  {'name' : 'android-support-v4', 'binary_jar' : 'com.phonegap.plugins.facebookconnect/app-FacebookLib/libs/android-support-v4.jar'},
  {'name' : 'bolts', 'binary_jar' : 'com.phonegap.plugins.facebookconnect/app-FacebookLib/libs/bolts-android-1.1.2.jar'},
```

and this to `RESOURCES

```python
  {'name':'facebook-plugin-res', 'package' : 'com.facebook.android', 'res' : 'com.phonegap.plugins.facebookconnect/app-FacebookLib/res', 'assets' : None},
```

and this to `LIBRARIES`

```python
  {'name':'facebook-plugin', 'deps' : [':all-jars', ':facebook-plugin-res', ':facebook_build_config'], 'srcs' : ['com.phonegap.plugins.facebookconnect/app-FacebookLib/src/**/*.java']},
```

To add the buildconfig file it needs, I added this to the `BuckConstants` file:

```python
FACEBOOK_BUILD_CONFIG_PARAMS = {'name':'facebook_build_config', 'package':'com.facebook.android'}
```

and this to the `BUCK` file.

```python
android_build_config(**FACEBOOK_BUILD_CONFIG_PARAMS)
```

Sometimes, you have files that depend on the state of your build. For instance, when you launch Android Studio using the standard play button or the debug button. If you launch with the debug button it, sets the `BUILD_CONFIG.DEBUG` flag to true. This plugin needed its own buildconfig file, so that's why it was added.

That does it for library projects. Now its time for the trickiest part...

### External Libraries

#### External Libraries Setup

In your `build.gradle` file for your project, you probably have something like this:

<img center src='/media/deps.png' />

The ones like `compile 'com.android.support:support-v4:22.0.0'` end up creating External Libraries. It downloads them from Maven and then stores them (in an exploded state).

### The Quick Way

You can build the library projects using the exploded aar folder and treat it just like an external library. However, I will go over the long way below.

### The Long Way

This is where we need to do some digging.

If you look on the Google Docs for [support libraries](http://developer.android.com/intl/es/tools/support-library/features.html) you will see that it tells you where it keeps the files locally (which aren't in the project root I need).

It tells me that I can look in `<sdk>/extras/android/support/v7/` to find the app compat 7 library. And guess what? All I need to do is create a local folder called `ExternalLibs` and drag in these files. Then, they are JUST like library projects and I can plug the data into the `PREBUILT_JARS`, `RESOURCES`, and `LIBRARIES` objects!

The tricky part is knowing what you actually need to look for. For example, in the project there was all this:

<img center src='/media/externals.png' />

There is some redundancy because there isn't a 1:1 correlation to adding something to your `build.gradle` file and getting one output here. For example, there are 4 `play-services` listed, but all of them 'belong' to the `google-play-services` library.

So I just navigated to `<sdk>/extras/android/support/v7/` path

<img center src='/media/fetch.png' />

And grabbed the `res` folder, the `AndroidManifest.xml` and the `.jar` files (I have a plugin that also used app-compat-v4, so I removed it - otherwise, I'll get a duplicate dex merge error) and copied them into my `ExternalLibs` folder. I also did this for `multi-dex` and `google-play-services` by digging around in the `<sdk>/extras/android/` directory. This is what my `ExternalLibs` ended up looking like.

<img center src='/media/externallibs.png' />

This is now EXACTLY like a library project, so I just need to update the `PREBUILT_JARS`, `RESOURCES`, and `LIBRARIES` objects with the appropriate paths. (Am I repeating myself? Good!).

Here's what the `BuckConstants` looks like with all the .jars, library projects, and external libraries handled:


```python
# Build rules for every .jar in the /ExternalLibraries folder. Add prebuilt jar rules here.

PREBUILT_JARS = [
  {'name' : 'xwalk-app-jar', 'binary_jar' : 'xwalk_core_library/libs/xwalk_core_library_java_app_part.jar'},
  {'name' : 'xwalk-library-jar', 'binary_jar' : 'xwalk_core_library/libs/xwalk_core_library_java_library_part.jar'},
  {'name' : 'appcompat-v7-22.0.0-jar', 'binary_jar' : 'ExternalLibs/appcompat-v7-22.0.0/android-support-v7-appcompat.jar'},
  {'name' : 'google-play-services-jar', 'binary_jar' : 'ExternalLibs/google-play-services_lib/google-play-services.jar'},
  {'name' : 'android-support-v4', 'binary_jar' : 'com.phonegap.plugins.facebookconnect/app-FacebookLib/libs/android-support-v4.jar'},
  {'name' : 'bolts', 'binary_jar' : 'com.phonegap.plugins.facebookconnect/app-FacebookLib/libs/bolts-android-1.1.2.jar'},
  {'name' : 'multidex-jar', 'binary_jar' : 'ExternalLibs/multidex/android-support-multidex.jar'},
]

# Build rules for all resources.

RESOURCES = [
  {'name' : 'appcompat-v7-22.0.0-res', 'package' : 'android.support.v7.appcompat', 'res' : 'ExternalLibs/appcompat-v7-22.0.0/res', 'assets' : None},
  {'name' : 'google-play-services-res', 'package' : 'com.google.android.gms', 'res' : 'ExternalLibs/google-play-services_lib/res', 'assets': None},
  {'name' : 'facebook-plugin-res', 'package' : 'com.facebook.android', 'res' : 'com.phonegap.plugins.facebookconnect/app-FacebookLib/res', 'assets' : None},
  {'name' : 'xwalk-lib-res', 'package' : 'org.xwalk.core', 'res' : 'xwalk_core_library/src/main/res', 'assets' : None},
  {'name' : 'cordova-lib-res', 'package' : 'org.apache.cordova', 'res' : 'CordovaLib/res', 'assets' : 'CordovaLib/assets'},
  {'name' : 'res', 'package' : 'co.pumpup.app', 'res': 'res', 'assets': 'assets'},
]

# Holds the name of all library build rules (except the main library).

LIB_DEPS = []

# Note: adding v4 causes a duplicate file crash with android-support-v4 from the Facebook plugin.
# Build rules all libraries.

LIBRARIES = [
  {'name' : 'appcompat-v7-22.0.0-lib', 'deps' : [':all-jars', ':appcompat-v7-22.0.0-res'], 'srcs' : None},
  {'name' : 'google-play-services-lib', 'deps' : [':all-jars',':google-play-services-res'], 'srcs' : None},
  {'name' : 'multidex-lib', 'deps' : [':all-jars'], 'srcs' : None},
  {'name' : 'xwalk-lib', 'deps' : [':all-jars', ':xwalk-lib-res'], 'srcs' : ['xwalk_core_library/src/**/*.java']},
  {'name' : 'cordova-lib', 'deps' : [':all-jars', ':cordova-lib-res'], 'srcs' : ['CordovaLib/src/**/*.java']},
  {'name' : 'facebook-plugin', 'deps' : [':all-jars', ':facebook-plugin-res', ':facebook_build_config'], 'srcs' : ['com.phonegap.plugins.facebookconnect/app-FacebookLib/src/**/*.java']},
  {'name' : 'application-lib', 'deps' : [':all-jars', ':build-config', ':jars__buck-android-support'], 'srcs' : [APP_CLASS_SOURCE]},
]

# This is required for CrossWalk .so Library

PREBUILT_NATIVE_LIBARY_PARAMS = {'name' : 'native_libs', 'native_libs' : 'xwalk_core_library/src/main/jniLibs'}

# Dependency rules for the main application library.

ALL_JARS_PARAMS = {'name' : 'all-jars', 'exported_deps' : JAR_DEPS}
ALL_LIBS_PARAMS = {'name' : 'all-libs', 'exported_deps' : LIB_DEPS}

# Required by Buck to build with the keystore rule.

KEYSTORE_PARAMS = {'name' : 'debug_keystore', 'store' : 'keystore/debug.keystore', 'properties' : 'keystore/debug.keystore.properties'}

FACEBOOK_BUILD_CONFIG_PARAMS = {'name' : 'facebook_build_config', 'package' : 'com.facebook.android'}
```

### Exopackage

#### Exopackage Setup

Up until now, I've been doing everything in the project except the root project files and resources. It's time to do that (and it's why I do the top level build rules as separate calls - now, all the libraries are made and the main application will depend on all of those made first).

Determining what you need to build can be a little confusing so I am going to gernally outline the process, though it's easier to pick out the files you need (a lot of folders and files are for the IDE and gradle). Because I have all the libraries handled, all I need are the `src`, `res`, `assets` and `AndroidManifest` files to make the binary. But because I am using Exopackage, I need to do an update.

It's explained [pretty well here](https://buckbuild.com/article/exopackage.html#use-exopackage).

I built the [buck-support-jar](https://buckbuild.com/article/exopackage.html#build-buck-support-library) and put it in the `libs` folder (which means it's handled already because of the regex loop I wrote at the beginning that gets `.jars` in the `libs1 folder)

I created an AppShell.java file:

```
/**
 * Buck support build file.
 */
public class AppShell extends ExopackageApplication
{
    public AppShell()
    {
        //co.pumpup.app.BuildConfig.EXOPACKAGE_FLAGS
        super(1);
    }

}
```

I couldn't actually get it to work with the BuildConfig, so I just pass 1 for now and left it commented.

I added an ExopackageApp file

```Java
public class ExopackageApp extends DefaultApplicationLike
{
    private final Application appContext;

    public ExopackageApp(Application appContext)
    {
        this.appContext = appContext;
    }

    @Override
    public void onCreate()
    {
        super.onCreate();
        ParsePlugin.initializeParseWithApplication(appContext);
    }
}
```

And updated my `AndroidManifest.xml` name tag in the application to `android:name=".AppShell"`.

### Binary Rules

#### Build Config

Next, I need to make the build config file for the app.

I add this to `BuckConstants`

```python
ANDROID_BUILD_CONFIG_PARAMS = {'name':'build-config', 'package': 'co.pumpup.app'}
```

and this to `BUCK`

```python
android_build_config(**ANDROID_BUILD_CONFIG_PARAMS)

```

The BuildConfig.java should have the   `public static final int EXOPACKAGE_FLAGS = 1;`, but it didn't for me. This  is why I hard coded the 1 in my AppShell.

#### Android Binary & Main Library Rules

Next, I am going to make the application library. I need to exclude the `AppShell` and `buck-support-library`.

So to the `BuckConstants` I add:

```python
APP_CLASS_SOURCE = 'src/co/pumpup/app/AppShell.java'
```

And then I create a parse object for the main library. In the `BuckConstants` file I add:

```python
ANDROID_MAIN_LIBRARY_PARAMS = {
  'name':'main-lib',
  'srcs':['src/**/*.java'],
  'deps':[
    ':all-jars',
    ':all-libs',
    ':native_libs',
    ':res',
  ]
}
```

and to the `BUCK` file I add:

```python
ANDROID_MAIN_LIBRARY_PARAMS['srcs'] = glob(ANDROID_MAIN_LIBRARY_PARAMS['srcs'], excludes = [APP_CLASS_SOURCE])
android_library(**ANDROID_MAIN_LIBRARY_PARAMS)
```

(remember, you can't glob in a constants file so I do the glob step here).

Last but not least, I need to create the `android_binary` rule. This is the final step and it depends on everything else (no wonder it's last!).

Here is what I added to the `BuckConstants` file:

```python
ANDROID_BINARY_PARAMS = {
  'name':'pumpup',
  'linear_alloc_hard_limit':16 * 1024 * 1024,
  'use_linear_alloc_split_dex':True,
  'manifest':'AndroidManifest.xml',
  'keystore':':debug_keystore',
  'use_split_dex':True,
  'exopackage_modes':['secondary_dex'],
  'primary_dex_patterns':[
    '^co/pumpup/app/AppShell^',
    '^co/pumpup/app/BuildConfig^',
    '^com/facebook/buck/android/support/exopackage/',
  ],
  'deps':[
    ':main-lib',
    ':application-lib',
  ],
}
```

then to the `BUCK` file I add:

```python
android_binary(**ANDROID_BINARY_PARAMS)
```

I was getting a dex merge error saying the files were too big, so I had to add the `linear_alloc_hard_limit` and `use_linear_alloc_split_dex` rules. The rest is pretty straightforward except the `primary_dex_patterns`. The `primary_dex_patterns` are anything your class needs to initialize goes here (otherwise you will get a crash).

After all this, I can now build the Android project at light speed:

<img center src='/media/fast.png' />

### Completed Buck Files

Here is the final `BuckConstants` file.

```python
# These are all the build rules and dependency arrays to build PumpUp. The BUCK file will use these as appropriate
# arguments when building the .apk.

# AppShell path for exopackage.

APP_CLASS_SOURCE = 'src/co/pumpup/app/AppShell.java'

# Holds name of all .jar's build with the prebuilt_jar rule.

JAR_DEPS = []

# Regex search and split values for searching libs folder.

REGEX_SEARCH = r'^.*/([^/]+)\.jar$'
REGEX_SPLIT = r'\1'

# Build rules for every .jar in the /ExternalLibraries folder. Add prebuilt jar rules here.

PREBUILT_JARS = [
  {'name' : 'xwalk-app-jar', 'binary_jar' : 'xwalk_core_library/libs/xwalk_core_library_java_app_part.jar'},
  {'name' : 'xwalk-library-jar', 'binary_jar' : 'xwalk_core_library/libs/xwalk_core_library_java_library_part.jar'},
  {'name' : 'appcompat-v7-22.0.0-jar', 'binary_jar' : 'ExternalLibs/appcompat-v7-22.0.0/android-support-v7-appcompat.jar'},
  {'name' : 'google-play-services-jar', 'binary_jar' : 'ExternalLibs/google-play-services_lib/google-play-services.jar'},
  {'name' : 'android-support-v4', 'binary_jar' : 'com.phonegap.plugins.facebookconnect/app-FacebookLib/libs/android-support-v4.jar'},
  {'name' : 'bolts', 'binary_jar' : 'com.phonegap.plugins.facebookconnect/app-FacebookLib/libs/bolts-android-1.1.2.jar'},
  {'name' : 'multidex-jar', 'binary_jar' : 'ExternalLibs/multidex/android-support-multidex.jar'},
]

# Build rules for all resources.

RESOURCES = [
  {'name' : 'appcompat-v7-22.0.0-res', 'package' : 'android.support.v7.appcompat', 'res' : 'ExternalLibs/appcompat-v7-22.0.0/res', 'assets' : None},
  {'name' : 'google-play-services-res', 'package' : 'com.google.android.gms', 'res' : 'ExternalLibs/google-play-services_lib/res', 'assets': None},
  {'name' : 'facebook-plugin-res', 'package' : 'com.facebook.android', 'res' : 'com.phonegap.plugins.facebookconnect/app-FacebookLib/res', 'assets' : None},
  {'name' : 'xwalk-lib-res', 'package' : 'org.xwalk.core', 'res' : 'xwalk_core_library/src/main/res', 'assets' : None},
  {'name' : 'cordova-lib-res', 'package' : 'org.apache.cordova', 'res' : 'CordovaLib/res', 'assets' : 'CordovaLib/assets'},
  {'name' : 'res', 'package' : 'co.pumpup.app', 'res': 'res', 'assets': 'assets'},
]

# Holds the name of all library build rules (except the main library).

LIB_DEPS = []

# Note: adding v4 causes a duplicate file crash with android-support-v4 from the Facebook plugin.
# Build rules all libraries.

LIBRARIES = [
  {'name' : 'appcompat-v7-22.0.0-lib', 'deps' : [':all-jars', ':appcompat-v7-22.0.0-res'], 'srcs' : None},
  {'name' : 'google-play-services-lib', 'deps' : [':all-jars',':google-play-services-res'], 'srcs' : None},
  {'name' : 'multidex-lib', 'deps' : [':all-jars'], 'srcs' : None},
  {'name' : 'xwalk-lib', 'deps' : [':all-jars', ':xwalk-lib-res'], 'srcs' : ['xwalk_core_library/src/**/*.java']},
  {'name' : 'cordova-lib', 'deps' : [':all-jars', ':cordova-lib-res'], 'srcs' : ['CordovaLib/src/**/*.java']},
  {'name' : 'facebook-plugin', 'deps' : [':all-jars', ':facebook-plugin-res', ':facebook_build_config'], 'srcs' : ['com.phonegap.plugins.facebookconnect/app-FacebookLib/src/**/*.java']},
  {'name' : 'application-lib', 'deps' : [':all-jars', ':build-config', ':jars__buck-android-support'], 'srcs' : [APP_CLASS_SOURCE]},
]

# This is required for CrossWalk .so Library

PREBUILT_NATIVE_LIBARY_PARAMS = {'name' : 'native_libs', 'native_libs' : 'xwalk_core_library/src/main/jniLibs'}

# Dependency rules for the main application library.

ALL_JARS_PARAMS = {'name' : 'all-jars', 'exported_deps' : JAR_DEPS}
ALL_LIBS_PARAMS = {'name' : 'all-libs', 'exported_deps' : LIB_DEPS}

# Required by Buck to build with the keystore rule.

KEYSTORE_PARAMS = {'name' : 'debug_keystore', 'store' : 'keystore/debug.keystore', 'properties' : 'keystore/debug.keystore.properties'}

# The build config objects for the main application and the Facebook plugin

ANDROID_BUILD_CONFIG_PARAMS = {'name' : 'build-config', 'package' : 'co.pumpup.app'}
FACEBOOK_BUILD_CONFIG_PARAMS = {'name' : 'facebook_build_config', 'package' : 'com.facebook.android'}

# The main application library.

ANDROID_MAIN_LIBRARY_PARAMS = {
  'name' : 'main-lib',
  'srcs' : ['src/**/*.java'],
  'deps' : [
    ':all-jars',
    ':all-libs',
    ':native_libs',
    ':res',
  ]
}

# The final .apk step. The linear_alloc_hard needs to be set because our dex files are larger than 4mb.
# use_linear_alloc_split_dex & use_split_dex must be set to true.

ANDROID_BINARY_PARAMS = {
  'name' : 'pumpup',
  'linear_alloc_hard_limit' : 16 * 1024 * 1024,
  'use_linear_alloc_split_dex' : True,
  'manifest' : 'AndroidManifest.xml',
  'keystore' : ':debug_keystore',
  'use_split_dex' : True,
  'exopackage_modes' : ['secondary_dex'],
  'primary_dex_patterns' : [
    '^co/pumpup/app/AppShell^',
    '^co/pumpup/app/BuildConfig^',
    '^com/facebook/buck/android/support/exopackage/',
  ],
  'deps': [
    ':main-lib',
    ':application-lib',
  ],
}
```

And here is the final `Buck` file.

```python
# These are the build rules which use arguments from BuckConstants to build all the files for the .apk.
# This speeds up Android Studio build times to about 10 seconds from 3 minutes.

import re
include_defs('//BuckConstants')

# Handles prebuilt_jars rule for jars in the libs folder updates JAR_DEPS.

for jarfile in glob(['libs/*.jar']):
  name = 'jars__' + re.sub(REGEX_SEARCH, REGEX_SPLIT, jarfile)
  prebuilt_jar(name = name, binary_jar = jarfile)
  JAR_DEPS.append(':' + name)

# Handles the jars in the ExternalLibs folder and updates JAR_DEPS.

for jar in PREBUILT_JARS:
  prebuilt_jar(name = jar['name'],binary_jar = jar['binary_jar'])
  JAR_DEPS.append(':' + jar['name'])

# Combines all jars into one library rule. This is a convienience dependency.

android_library(**ALL_JARS_PARAMS)

# Builds android_resource for each resource in RESOURCES.

for resource in RESOURCES:
  android_resource(name = resource['name'], package = resource['package'], res = resource['res'], assets = resource['assets'])

# glob can't be set in the constants file, so we glob here else: AssertionError: Cannot use `glob()` at the top-level of an included file.
# Builds android_libraary for each library in LIBRARIES.

for library in LIBRARIES:
  library['srcs'] = glob(library['srcs'])
  android_library(name = library['name'],deps = library['deps'],srcs = library['srcs'])
  LIB_DEPS.append(':' + library['name'])

# Combines all libraries into one dependency (except the main library).

android_library(**ALL_LIBS_PARAMS)

# Special rule for the .so library in CrossWalk.

prebuilt_native_library(**PREBUILT_NATIVE_LIBARY_PARAMS)

# Sets keystore config which is required for builds.

keystore(**KEYSTORE_PARAMS)

# Builds the required build config file for Facebook plugin.

android_build_config(**FACEBOOK_BUILD_CONFIG_PARAMS)

# Builds the build config file for the main .apk.
android_build_config(**ANDROID_BUILD_CONFIG_PARAMS)

# Builds the main library for the .apk. glob must be called here (not in BuckConstants).

ANDROID_MAIN_LIBRARY_PARAMS['srcs'] = glob(ANDROID_MAIN_LIBRARY_PARAMS['srcs'], excludes = [APP_CLASS_SOURCE])
android_library(**ANDROID_MAIN_LIBRARY_PARAMS)

# Builds the .apk and is the final build step.

android_binary(**ANDROID_BINARY_PARAMS)
```

### Errors:

***Couldn't get dependency:*** You mis-named something (e.g. myJar.jar instead of myJar-1.1.jar) or missing “,” in deps.

***BUILD FAILED: //:all-lib-jars: parameter 'deps': cannot coerce:*** Wrong path to target, missing comma, or wrong build target.

***package org.xwalk.core does not exist***. Check dependencies and package name spelling.

***error: cannot find symbol import com.facebook.android.R;*** Check package name spelling.

***error: cannot find symbol import com.facebook.android.BuildConfig;*** This library project needs a build config file. Need the [android_build_config](https://buckbuild.com/rule/android_build_config.html) rule.

***failed on step symlink_assets with an exception: Multiple entries with same key:***

https://github.com/facebook/buck/commit/03a5c117fcb9e62664f830827f5b63a4f04c7266

This was a bug that was patched out. Make sure your buck is using the latest version.

***nothing matches overlay file icon.png, for flavor*** This went away once my project was building properly with Buck.

***res/drawable-mdpi/doneicon_nc.png: libpng warning: iCCP: Not recognizing known sRGB profile that has been edited*** This went away once my project was building properly with Buck (I suspect it was an issue with a library wanting something it didn't have).

***Couldn't get dependency '//:appcompat-v7-22.0.0-lib' of target '//:all-lib-jars':*** You are missing a rule by that name because it can't find that dependency (spelling?).

**BUILD FAILED: When the 'res' is specified for android_resource() //:appcompat-v7-22.0.0-res, at least one of 'package' or 'manifest' must be specified.**
Needs the build rule package. Get it from the AndroidManifest.xml. (Note manifest is not a supported argument on the site at least? Documentation issue?)

***res/values/theme.xml:3: error: Error retrieving parent for item: No resource found that matches the given name 'Theme.AppCompat.Light.NoActionBar'.** Getting the external lib in (app compat v7) fixed this.

***ExternalLibs/appcompat-v7-22.0.0/res/values-v23/styles_base.xml:20: error: Error retrieving parent for item: No resource found that matches the given name 'android:Widget.Material.Button.Colored'.***
This one was an issue.

http://stackoverflow.com/questions/32075498/error-retrieving-parent-for-item-no-resource-found-that-matches-the-given-name

Bad News: Setting
```python
[android]
    target = Google Inc.:Google APIs:23
```

In the .buckconfig does fix this error. But I didnt WANT to compile against that. I've left it for now but it needs to be changed to 22.

***BUILD FAILED: Secondary dex exceeds linear alloc limit.***
https://github.com/facebook/buck/issues/385 adding this to the `android_binary` fixes it.
```
use_linear_alloc_split_dex = true
linear_alloc_hard_limit = 16 * 1024 * 1024,
```

***There was an error in smart dexing step
com.facebook.buck.step.StepFailedException: Failed on step dx_&&_write_file with an exception:
Multiple dex files define Lco/pumpup/app/AppShell;
BUILD FAILED: //:pumpup#dex_merge failed with exit code 1:
smart_dex***

http://stackoverflow.com/questions/26342444/multiple-dex-files-define-landroid-support-annotation-animres

Here I was a conflict between `app-compat-v4` being added twice (because a plugin also added it. Removing my extra copy fixed it.

***SPECIAL CROSSWALK ISSUE***
In the off chance you have CrossWalk I got a really nasty error that made no sense but it was because I didn't include the .so file it needed.

https://crosswalk-project.org/jira/browse/XWALK-3615

Adding the rule
```python
prebuilt_native_library(
  name = 'native_libs',
  native_libs = 'xwalk_core_library/src/main/jniLibs',
)
```
fixes it.

