define(function () {
    return function (f, g) {
        return function (x) {
            return f(g(x))
        }
    }
})
