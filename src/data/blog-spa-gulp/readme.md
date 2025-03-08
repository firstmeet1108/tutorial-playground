## 说明
本示例使用gulp，引入了构建build这一过程和工具，从而为客户端应用的开发提供了各类预处理

## 基本工具
// 首先安装全局gulp、bower工具
npm install --global gulp-cli

## 安装项目依赖
// 将项目代码copy至本机后，务必进入项目根目录
cd project_path

// 按package.json的内容自动下载构建环境依赖包(服务端依赖)，即gulp相关plugin，项目根目录下将多出一个node_modules的子目录
npm install


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

