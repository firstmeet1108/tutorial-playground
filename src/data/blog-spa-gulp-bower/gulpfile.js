var gulp = require('gulp'),
    concat = require('gulp-concat'),    
    mainBowerFiles = require('gulp-main-bower-files'),
    uglify = require('gulp-uglify'),
    mergeStream =   require('merge-stream')

// 由于ejs.js当前不支持amd和bower工具，故只能按旧方法处理
gulp.task('compress', function () {
  var  lib = gulp.src('./bower.json')
              .pipe(mainBowerFiles( ))             
  var main = gulp.src('./js/*.js') 
                        
  return mergeStream(lib,main)  
        .pipe(uglify())       
        .pipe(concat('app.js'))                         
        .pipe(gulp.dest('./dist'))    

});