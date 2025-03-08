/*
  调试提示：
  1、 浏览器的devtools(F12)允许对Localstorage进行调试，在application面板中  https://www.html.cn/doc/chrome-devtools/manage-data/local-storage/
  2、 当存在页面跳转时，console里的日志通常会被跳过，注意勾选console面板中preserve log选项 https://blog.csdn.net/qq_35421305/article/details/115325546
  3、 更多调试工具信息  https://zhuanlan.zhihu.com/p/62177097
*/

//此处的缺陷是，仅支持一种内容类型或数据表即post，如果系统中存在两种内容类型如帖子和用户，则难以处理。
//解决方案可以考虑使用indexDB或WebSql等存储方式。以及使用https://github.com/localForage/localForage/ 这类的通用库。
function getPosts(){
  let posts = []
  for ( var i = 0, len = localStorage.length; i < len; ++i ) {
    let post  = localStorage.getItem( localStorage.key( i ) )         
    posts[i] = JSON.parse(post)
  }
  return posts
}

function getPost(id){
  post =  localStorage.getItem( id )
  return JSON.parse(post)
}

// 获取最大的id，以防止冲突。模拟mysql中的自增长id。
function get_last_key(){
  let max = 0
  for ( var i = 0, len = localStorage.length; i < len; ++i ) {
    key = parseInt(localStorage.key( i ))
    if(key > max){max = key}
  }
  return max + 1
}

// Todo:客户端的数据检验,留给同学们
function post_create(){   
  let post = {}   
  post["title"] = $('input[name=title]').val()
  post["body"] = $('textarea[name=body]').val()
  today = new Date()
  post["created_at"] = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
  post["id"] = get_last_key()
  localStorage.setItem(post["id"], JSON.stringify(post))      
  return true
}

function post_update(){         
  let id = $('input[name=id]').val()
  let post = getPost(id)      
  post["title"] = $('input[name=title]').val()
  post["body"] = $('textarea[name=body]').val()
  
  localStorage.setItem(post["id"], JSON.stringify(post))      
  return true
}

function postDestroy(id){   
  localStorage.removeItem(id)
}

function renderTemplate(domId,tplName,resourceType,resourceId){
  
  data = resourceId ? getPost(resourceId) : getPosts()
  console.log(data)
  // 字符串插值
  path = `./tpl/${tplName}.tpl`

  $.get(path, function(tpl){         
    // 这里使用了链接调用,可以节省一个本地变量
    // {data:data} 指将此处的data变量映射为模板文件里的data变量，对于json内容为数组的尤其有用（json内容为对象的，则可以直接通过对象属性名访问）
    result = ejs.compile(tpl)(  {data:data}  )
    $(domId).html(result);
  });
}

