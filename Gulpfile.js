var gulp = require('gulp');
var sass = require('gulp-sass');
var sassPaths = {
	allFiles: 'app/assets/sass/**/*.scss',
	src: 'app/assets/sass/**/app.scss',
	dest: './app/assets/css/'
};

gulp.task('styles', function() {
    gulp.src(sassPaths.src)
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest(sassPaths.dest));
});

gulp.task('default',function() {
    gulp.watch(sassPaths.allFiles,['styles']);
});
