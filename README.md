# amd-loader 一个AMD规范的模块加载器
看到戴嘉华老师在早年微信的面经里说自己写了一个模块加载器，于是自己也来试写一个简略的AMD模块加载器,简单的实验性项目。
直接写了es6也没用babel转译，哈哈有点懒。。

**不声明依赖便直接从模块中扫描require获取依赖**的功能并不支持。

## example 使用示例

math/inc_and_square.js
```javascript
// 定义先让数字加一再平方的模块
define('inc_and_square', ['../compose', './inc', './square'], function (compose, inc, square) {
    return compose(square, inc)
})

```
math/inc.js
```javascript
// 自增模块
define(function () {
    return function (a) {
        return ++a
    }
})
```
math/square.js
```javascript
// 平方模块
define(function (require, exports, module) {
    module.exports = function (a) {
        return a * a
    }
})
```

compose.js
```javascript
// 函数组合模块
define(function () {
    return function (f, g) {
        return function (x) {
            return f(g(x))
        }
    }
})
```
好了，现在在index.html里：
index.html:
```html
<script>
    // 加载一个能让输入自增后平方的函数
    require(['math/inc_and_square'], function(incAndSquare){
        console.log(incAndSquare(1)) //输出4！大功告成
    })
</script>
```
