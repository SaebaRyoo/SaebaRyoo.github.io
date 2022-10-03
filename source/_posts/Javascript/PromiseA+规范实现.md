---
title: Promise/A+规范实现
categories:
- 前端
tags: 
- JavaScript
- Promise
---

```
var soon = (function() {
  var c = [];
  function b() {
    while (c.length) {
      var d = c[0];
      d.f.apply(d.m, d.a);
      c.shift();
    }
  }
  var a = (function() {
    if (typeof MutationObserver !== "undefined") {
      var d = document.createElement("div");
      return function(e) {
        var f = new MutationObserver(function() {
          f.disconnect();
          e();
        });
        f.observe(d, { attributes: true });
        d.setAttribute("a", 0);
      };
    }
    if (typeof setImmediate !== "undefined") {
      return setImmediate;
    }
    return function(e) {
      setTimeout(e, 0);
    };
  })();
  return function(d) {
    c.push({ f: d, a: [].slice.apply(arguments).splice(1), m: this });
    if (c.length == 1) {
      a(b);
    }
  };
})();

function Promise(executor) {
  var self = this;
  self.status = 'pending';
  self.callbacks = [];
  self.data = null;

  function resolve(value) {
    soon(function() {
      if (self.status === 'pending') {
        self.status = 'resolved'; // 这里的状态改变后就不会再变
        self.data = value;
        var i = 0, len = self.callbacks.length;
        for (; i<len; i++) {
          self.callbacks[i].onResolved(self.data);
        }
      }
    })
  }

  function reject(reason) {
    soon(function() {
      if (self.status === 'pending') {
        self.status = 'rejected';
        self.data = value;
        var i = 0, len = self.callbacks.length;
        for (; i<len; i++) {
          self.callbacks[i].onRejected(self.data);
        }
      }
    })
  }

  try {
    executor(resolve, reject);
  } catch(e) {
    reject(e);
  }
}

function resolvePromise(promise2, x, resolve, reject) {
  var thenCalledOrthrow = false;
  if (promise2 === x) {
    reject(new TypeError(`${promise2} and ${x} refer to the same object`));
    return;
  }
  
  if (x instanceof Promise) {
    if (x.status === 'pending') {
      x.then(function(value) {
        resolvePromise(promise2, value, resolve, reject)
      }, reject);
    } else {
      x.then(resolve, reject)
    }
    return;
  }

  if ( x !== null && ( (typeof x === 'object') || (typeof x === 'function') ) ) {
    try {
      var then = x.then;
      if (typeof then === 'function') {
        then.call(x, function rs(y) {
          if (thenCalledOrthrow) return;
          thenCalledOrthrow = true;
          resolvePromise(promise2, y, resolve, reject);
        }, function rj(r) {
          if (thenCalledOrthrow) return;
          thenCalledOrthrow = true;
          reject(r);
        })
      } else {
        resolve(x);
      }
    } catch(e) {
      if (thenCalledOrthrow) return;
      thenCalledOrthrow = true;
      reject(e);
    }
  } else {
    resolve(x);
  }
}

Promise.prototype.then = function(onResolved, onRejected) {
  onResolved = typeof onResolved === 'function' ? onResolved : function(v) {return v};
  onRejected = typeof onRejected === 'function' ? onRejected : function(r) {throw r};
  var self = this;
  var promise2;

  if (self.status === 'pending') {
    return promise2 = new Promise(function(resolve, reject) {
      self.callbacks.push({
        onResolved: function(value) {
          try {
            var x = onResolved(value);
            resolvePromise(promise2, x, resolve, reject);
          } catch(e) {
            reject(e);
          }
        },
        onRejected: function(reason) {
          try {
            var x = onRejected(reason);
            resolvePromise(promise2, x, resolve, reject);
          } catch(e) {
            reject(e);
          }
        }
      })
    })
  }

  if (self.status === 'resolved') {
    return promise2 = new Promise(function(resolve, reject) {
      soon(function() {
        try {
          var x = onResolved(self.data);
          resolvePromise(promise2, x, resolve, reject);
        } catch(e) {
          reject(e)
        }
      })
    })
  }

  if (self.status === 'rejected') {
    return promise2 = new Promise(function(resolve, reject) {
      soon(function() {
        try {
          var x = onRejected(self.data);
          resolvePromise(promise2, x, resolve, reject);
        } catch(e) {
          reject(e)
        }
      })
    })
  }
}

Promise.prototype.catch = function(onRejected) {
  return this.then(null, onRejected);
}

Promise.prototype.finally = function(cb) {
  return this.then(function(value) {
    soon(cb);
    return value;
  }, function(reason) {
    soon(cb);
    return reason;
  })
}

Promise.done = function() {
  return new Promise(function() {})
}

Promise.resolve = function(v) {
  var promise2;
  return promise2 = new Promise(function(resolve, reject) {
    resolvePromise(promise2, v, resolve, reject);
  })
}

Promise.reject = function(r) {
  return new Promise(function (_, reject) {
    reject(r);
  })
}

Promise.all = function(promises) {
  return new Promise(function(resolve, reject) {
    var valueArr = [];
    var resolvedCount = 0;
    var len = promises.length;
    for (var i = 0; i < len; i++) {
      (function(i) {
        promises[i].then(function rs(value) {
          valueArr.push(value);
          resolvedCount++;
          if (resolvedCount === len) {
            resolve(valueArr);
          }
        }, function rj(r) {
          reject(r);
        })
      }(i))
    }
  })
}

Promise.race = function(promises) {
  return new Promise(function(resolve, reject) {
    var len = promises.length;
    var flag = false;
    for(var i = 0; i < len; i++) {
      (function(i) {
        promises[i].then(function(v) {
          if (flag) return;
          flag = true;
          resolve(v)
        }, function(r) {
          if (flag) return;
          flag = true;
          reject(r)
        })
      } (i))
    }
  })
}
```