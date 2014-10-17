var gulp = require('gulp');
var mocha = require('gulp-mocha');

gulp.task('build', function () {
    return gulp.src('test/*', {read: false})
        .pipe(mocha({reporter: 'tap'}));
});