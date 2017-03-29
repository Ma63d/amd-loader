define('inc_and_square', ['../compose', './inc', './square'], function (compose, inc, square) {
    // 先让数字加一再平方的函数
    return compose(square, inc)
})
