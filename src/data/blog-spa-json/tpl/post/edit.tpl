  <h2>编辑</h2>
  <form action="#" method="post" onsubmit="return post_update()">
    <input type="hidden" name="id" value="<%= data.id %>"/>    
    <label for="title">title</label>
    <input type="text" name="title" value="<%= data.title %>" />
    <br/>
    <label for="body">body</label>
    <textarea name="body">
      <%= data.body %>
    </textarea>
    <br/>
    <input type="submit" value="提交" />
  </form>
