---
title: 基于React实现一个内容滑动组件
date: 2023-04-12
categories:
  - 前端
tags:
  - React
---

最近在做项目时遇到一个需求，需要让一个列表能够通过点击按钮进行滚动，每次都是一屏的距离，不足则结束。并且，这个列表项是在[react-grid-layout](https://github.com/react-grid-layout/react-grid-layout)中的某一个模块内。所以包裹这个列表的容器会随时发生变化。在完成这个组件后，通过这篇文章总结一下。

## UI/原型分析

那么从上面的功能描述以及项目中的 UI，我们可以分析得到这样一个假想图：
![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b08cd8dcffb247a7b9256f4041993a67~tplv-k3u1fbpfcp-watermark.image?)

1. 我们需要实现一个容器来作为我们的**可视区域**，并且这个容器是可以伸缩的。
2. 列表内容如果超出容器的**可视区域**，那么就会被隐藏。
3. 需要左右都有按钮，来支持用户左右滑动内容来查看，每次滑动距离为 容器的宽度，也就是`可视区域`
4. 当在伸缩容器的时候，如果是向右侧伸缩，并且**可视区域**已经被拉伸的超出了列表被隐藏的右侧内容时，右侧的隐藏内容需要有一个**吸附效果**，即跟着被伸缩的容器移动，直到左侧隐藏内容的偏移值为 0。

话不多说，我们先上简单的最终效果图

- 有固定宽度，不可伸缩
  ![slider-demo.gif](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f1e7d028cbd44d54be496daff25e7076~tplv-k3u1fbpfcp-watermark.image?)

- 无固定宽度，可伸缩（这里直接用[币安](https://www.binance.com/zh-CN/futures/BTCUSDT)的效果来展示，如果你有兴趣，可以自己下载个`react-grid-layout`或者其他库来试一下效果）

![mxefs-bl7av.gif](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a9ef5d5ca4d644fdaa0c59882647493e~tplv-k3u1fbpfcp-watermark.image?)

## 功能实现

### 监听元素尺寸变化

> 工欲善其事必先利其器

在分析完后，我们发现有一个点。如果要支持`react-grid-layout`这类的伸缩功能，需要能够监听到元素的动态变化。

那么，我们可以先将这部分逻辑抽离，封装成一个`hook`:

`hooks/useResizeObserver.ts`

```ts
import { useLayoutEffect, useState } from "react";

// 接收保存被监听dom的ref
const useResizeObserver = (ref: React.RefObject<HTMLElement>) => {
  const [width, setWidth] = useState<number>(0);
  useLayoutEffect(() => {
    // 使用ResizeObserver来监听DOM的变化
    const resizeObserver = new ResizeObserver(() => {
      setWidth((ref.current as HTMLElement).clientWidth);
    });
    resizeObserver.observe(ref.current as HTMLElement);
    return () => {
      resizeObserver.disconnect();
    };
  }, [ref]);
  return width;
};
export default useResizeObserver;
```

其中核心的逻辑是使用`ResizeObserver`类来监听一个元素的尺寸变化。然后返回变化后的`width`

## 组件开发。

有了上面的分析，再实现代码就是一步步走即可。所以我们直接贴代码：

`components/SliderContainer/index.tsx`

```tsx
import React, {
  useMemo,
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
} from "react";
import type { ReactElement } from "react";
import "./index.css";
import ArrowLeft from "@/assets/arrow-left.svg";
import ArrowRight from "@/assets/arrow-right.svg";
import useResizeObserver from "@/hooks/useResizeObserver";

export interface SliderContainerProps {
  width: number;
  children: ReactElement; // 需要包括的内容
}

const LEFT = "left";
const RIGHT = "right";

export const SliderContainer: React.FC<SliderContainerProps> = ({
  width = "inherit",
  children,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerWidth = useResizeObserver(containerRef);
  const [listWidth, setListWidth] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  // 缓存
  const cache = useRef(containerWidth);

  // 处理容器宽度变化时，内部元素的吸附效果
  useEffect(() => {
    if (
      containerWidth > cache.current && // 当容器可拖拽时，表示用户正在向右拖拽
      translateX < 0 && // 表示左侧有内容被隐藏
      listWidth - Math.abs(translateX) - containerWidth <= 0 //表示右侧已经没有被隐藏的内容了
    ) {
      const distance = containerWidth - cache.current;
      setTranslateX((cur) => cur + distance);
    }
    // 更新缓存
    cache.current = containerWidth;
  }, [containerWidth, translateX, listWidth]);

  useLayoutEffect(() => {
    setListWidth((listRef.current as HTMLDivElement).clientWidth);
  }, [children]);

  // 判断按钮是否可见
  const [leftArrowVisible, rightArrowVisible] = useMemo(() => {
    let leftArrowVisible,
      rightArrowVisible = false;
    // listWidth - Math.abs(translateX) - containerWidth 为右侧隐藏内容
    if (listWidth - Math.abs(translateX) - containerWidth > 0) {
      rightArrowVisible = true;
    }

    if (translateX < 0) {
      leftArrowVisible = true;
    }

    return [leftArrowVisible, rightArrowVisible];
  }, [listWidth, translateX, containerWidth]);

  const handleArrowClick = (direction: string) => {
    if (direction === LEFT) {
      // 左侧隐藏内容
      const leftSpaceWidth = Math.abs(translateX);
      if (leftSpaceWidth > containerWidth) {
        setTranslateX((cur) => cur + containerWidth);
      } else {
        setTranslateX((cur) => cur + leftSpaceWidth);
      }
    }

    if (direction === RIGHT) {
      // 右侧隐藏内容
      const rightSpaceWidth = listWidth - Math.abs(translateX) - containerWidth;
      if (rightSpaceWidth > containerWidth) {
        setTranslateX((cur) => cur - containerWidth);
      } else {
        setTranslateX((cur) => cur - rightSpaceWidth);
      }
    }
  };

  return (
    <div ref={containerRef} style={{ width: width }} className="container">
      {leftArrowVisible && (
        <>
          <button
            color="white"
            className="leftArrow btn"
            onClick={() => handleArrowClick(LEFT)}
          >
            <img src={ArrowLeft} alt="" />
          </button>
          <div className="linerGrid leftGradient"></div>
        </>
      )}
      <div
        ref={listRef}
        className="list"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: "all 0.3s linear",
        }}
      >
        {children}
      </div>
      {rightArrowVisible && (
        <>
          <div className="linerGrid rightGradient"></div>
          <button
            color="white"
            className="rightArrow btn"
            onClick={() => handleArrowClick(RIGHT)}
          >
            <img src={ArrowRight} alt="" />
          </button>
        </>
      )}
    </div>
  );
};
```

组件目前设置了两个属性`width`和`children`

- **width**: 如果不传，默认`inherit`，表示该容器是可伸缩的，那么组件内部会自己计算；如果传了固定宽度，则按照该固定宽度来设置
- **children**: 需要滚动的内容

**其中，主要是有 5 个点需要着重理解**

1. 在`useLayoutEffect`中，需要通过传入的`children`来判断是否需要更新`list`的长度，防止计算不准确
2. 判断按钮何时显示
3. 按钮点击时需要处理的 UI 逻辑
4. 如果容器是可伸缩的，需要通过`useRef`的缓存来判断用户向哪个方向伸缩容器
5. 使用`transform`和`transition`让动画更流畅自然

对应的 css 样式为:

`components/SliderContainer/index.css`

```css
.container {
  display: flex;
  overflow: hidden;
  position: relative;
  height: 100%;
}

.list {
  display: flex;
  align-items: center;
}

.btn {
  width: 40px;
  height: 100%;
  position: absolute;
  z-index: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}
.leftArrow {
  left: 0;
}
.rightArrow {
  right: 0;
  z-index: 0;
}

.linerGrid {
  position: absolute;
  width: 20px;
  height: 100%;
}

.leftGradient {
  left: 40px;
  z-index: 1;
  background: linear-gradient(to right, #fff, rgba(255, 255, 255, 0.2));
}

.rightGradient {
  right: 40px;
  background: linear-gradient(269.21deg, #ffffff, rgba(255, 255, 255, 0.2));
}
```

## 使用方式

我们可以通过下面的方式来使用

```tsx
const list = [
  { key: "1", name: "列表项1" },
  { key: "2", name: "列表项2" },
  { key: "3", name: "列表项3" },
  { key: "4", name: "列表项4" },
  { key: "5", name: "列表项5" },
  { key: "6", name: "列表项6" },
  { key: "7", name: "列表项7" },
  { key: "8", name: "列表项8" },
  { key: "9", name: "列表项9" },
  { key: "10", name: "列表项10" },
];
function App() {
  return (
    <div className="App">
      <SliderContainer width={300}>
        <>
          {list.map((item) => (
            <div style={{ width: 100 }} key={item.key}>
              {item.name}
            </div>
          ))}
        </>
      </SliderContainer>
    </div>
  );
}
```
