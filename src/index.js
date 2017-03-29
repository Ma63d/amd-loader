(function (win, doc) {
    const dir = resolvePath(win.location.pathname, '')
    const CREATED = 0
    const LOADING = 1
    const LOADED = 2
    // 一个简单的pub/sub模式
    class Pub {
        constructor () {
            this.cbs = []
        }
        trigger () {
            this.cbs.map(cb => {
                cb()
            })
        }
        addCb (cb) {
            // 因为越后添加的sub说明越是底层的依赖，应该尽早被执行，而早先添加的可能还有着大量其他依赖
            this.cbs.unshift(cb)
        }
    }
    const BUILT_IN_MODULE_MAP = {
        'require': true,
        'module': true,
        'exports': true
    }
    function checkBuiltInModule (id) {
        return !!BUILT_IN_MODULE_MAP[id]
    }
    const headDom = doc.getElementsByTagName('head')[0];
    class Module extends Pub {
        constructor (id, needStore) {
            super()
            this.id = id
            this.deps = null
            this.module = {
                exports: {}
            }
            this.status = CREATED
            if (needStore) {
                Module.modules[id] = this
            }
            this.waitDeps = 0
        }
        defineDeps (deps) {
            this.deps = deps.map(dep => {
                if (!checkBuiltInModule(dep)) {
                    return resolvePath(this.id, dep)
                } else {
                    return dep
                }
            })
        }
        defineFactory (factory) {
            this.status = LOADING
            this.cb = factory
        }
        load () {
            let script = doc.createElement('script')
            script.src = this.id + '.js'
            script.async = true
            headDom.appendChild(script)
        }
        transferDepsAndLoad () {
            // 将依赖转换为module，并且加载module
            let canExcuted = true
            for (let dep of this.deps) {
                if (!checkBuiltInModule(dep)) {
                    if (!Module.modules[dep]) {
                        let module = Module.modules[dep] = new Module(dep, true)
                        module.addCb(this.cb)
                        module.load()
                        canExcuted = false
                        this.waitDeps++
                    } else {
                        let module = Module.modules[dep]
                        if (module.status === LOADING) {
                            module.addCb(this.cb)
                            canExcuted = false
                            this.waitDeps++
                        }
                    }
                }
            }
            if (canExcuted) {
                this.cb()
            }
        }
    }
    Module.modules = {}
    function resolveModuleFactory (currentId) {
        return function (relativeId) {
            let targetModuleId = resolvePath(currentId, relativeId)
            return Module.modules[targetModuleId] && Module.modules[targetModuleId].module.exports
        }
    }
    function require (deps, factory) {
        let currentModule = new Module(dir, false)
        currentModule.defineDeps(deps)
        if (!factory) {
            factory = deps
            deps = ['require', 'exports', 'module']
        }
        let cb = factoryWrapper(currentModule, factory)
        currentModule.defineFactory(cb)
        currentModule.transferDepsAndLoad()
    }
    function define (id, deps, factory) {
        if (arguments.length === 2) {
            factory = deps
            deps = id
            // currentScript是一个非标准属性
            let src = doc.currentScript.src
            id = src.replace(win.location.origin, '').replace('.js', '')
        } else if (arguments.length === 1) {
            factory = id
            deps = ['require', 'exports', 'module']
            let src = doc.currentScript.src
            id = src.replace(win.location.origin, '').replace('.js', '')
        } else {
            // AMD规范中规定，如果自己给了ID，那么ID是absolute id
            id = resolvePath(dir, id)
        }
        let currentModule = Module.modules[id]
        currentModule.defineDeps(deps)
        let cb = factoryWrapper(currentModule, factory)
        currentModule.defineFactory(cb)
        currentModule.transferDepsAndLoad()
    }
    function factoryWrapper (currentModule, factory) {
        return function () {
            if (currentModule.waitDeps > 0) {
                currentModule.waitDeps--
            }
            if (currentModule.waitDeps === 0) {
                let modules = []
                currentModule.status = LOADED
                let deps = currentModule.deps
                for (let i = 0; i < deps.length; i++) {
                    let dep = deps[i]
                    if (checkBuiltInModule(dep)) {
                        switch (dep) {
                        case 'require':
                            modules.push(resolveModuleFactory(dir))
                            break
                        case 'exports':
                            modules.push(currentModule.module.exports)
                            break
                        case 'module':
                            modules.push(currentModule.module)
                            break
                        }
                    } else {
                        modules.push(Module.modules[dep] && Module.modules[dep].module.exports)
                    }
                }
                currentModule.module.exports = factory.apply(this, modules) || currentModule.module.exports
                currentModule.trigger()
            }
        }
    }
    function resolvePath (absolutePath, relativePath) {
        let dirPath = absolutePath.slice(0, absolutePath.lastIndexOf('/') + 1)
        if (relativePath.slice(0, 2) === '..') {
            let upperDir = dirPath.slice(0, -1)
            upperDir = upperDir.slice(0, upperDir.lastIndexOf('/') + 1)
            return upperDir + relativePath.slice(3)
        } else {
            return dirPath + (relativePath[0] === '.' ? relativePath.slice(2) : relativePath)
        }
    }
    win.require = require
    win.define = define
})(window, document)
