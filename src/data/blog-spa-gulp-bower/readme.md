## 说明
本示例使用gulp + bower，简化了各类js第三方依赖库的安装

## 基本工具
// 首先安装全局gulp、bower工具
npm install --global gulp-cli
npm install -g bower

## 安装项目依赖
// 将项目代码copy至本机后，务必进入项目根目录
cd project_path

// 按package.json的内容自动下载构建环境依赖包(服务端依赖)，即gulp相关plugin，项目根目录下将多出一个node_modules的子目录
npm install

// 按bower.json的内容自动下载本项目的客户端依赖包，项目根目录下将多出一个bower_components的子目录
bower install

## 自动构建
// 查看gulp已有构建任务
gulp --tasks

// 执行压缩任务，执行成功后，dist子目录下新增了一个app.js文件，即所有依赖js文件的压缩包
gulp compress 

// 启动Web服务器，运行网站


## 相关说明

上述项目依赖自动化安装，相当于替代以下手工过程
npm install gulp --save-dev

// 安装本项目依赖的gulp plugin
npm install gulp-main-bower-files --save-dev
npm install gulp-uglify --save-dev
npm install gulp-concat --save-dev
npm install merge-stream --save-dev

// 安装bower plugin
bower install jquery 
bower install director

## 关于bower下载github库文件失败问题
https://blog.frytea.com/archives/421/
git config --global --unset http.proxy
git config --global --unset https.proxy




