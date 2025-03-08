<table border=1>
    <caption><h1>帖子列表</h1></caption>
    <thead>
      <tr>
        <th>id</th>
        <th>标题</th>
        <th>创建日期</th>
        <th>操作</th>        
      </tr>
    </thead>
    <tbody>

      <% data.forEach(function(post){ %>        
        <tr>
          <td><%= post.id %></td>
          <td><a href="#/posts/<%= post.id %>"><%= post.title %></a></td>
          <td><%= post.created_at %></td> 
          <td>
            <a href="#/posts/<%= post.id %>/edit">改</a>
            <a href="#/posts/<%= post.id %>/delete">删</a>
          </td> 
        </tr> 
      <% }) %>


    </tbody>
  </table>
  <a href="#/posts/new">新增</a>