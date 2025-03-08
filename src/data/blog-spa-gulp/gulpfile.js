var gulp = require('gulp'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify')    

gulp.task('compress', function () {
  return gulp.src('./js/*.js')
        .pipe(uglify())
        .pipe(concat('app.js'))
        .pipe(gulp.dest('./dist'))        
});