# json-server版本

## 说明


## 前提
* node.js 环境
* 安装serve npm i -g serve
* 安装json-server npm i -g json-server

## 启动
* 在项目根目录下，启动json-server做为api服务器，以下指定端口
```
json-server --watch --port 8090 data/posts.json
```
在浏览器中检查 http://localhost:8090/ 是否能成功访问

* 打开另一个终端窗口，在项目根目录下，启动serve作为Web服务器
```
serve
```
在浏览器中运行给出的地址

## todo
仅仅实现了/posts和posts/:id这两个api，其它增删请仿照localstorge版本实现