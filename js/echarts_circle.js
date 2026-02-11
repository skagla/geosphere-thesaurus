eCharts_circleChart = function (rawData, elementId) {
  let allowedMaxDepth = 5;
  let chartDom = document.getElementById(elementId);
  let myChart = echarts.init(chartDom, null, {
    renderer: "svg",
  });

  //prevent default right click behavior
  chartDom.oncontextmenu = function (e) {
    e.preventDefault();
  };

  function outputsize() {
    setTimeout(function () {
      myChart.resize();
    }, 10);
  }
  new ResizeObserver(outputsize).observe(chartDom);

  var option;

  //convert the raw data (nested) to flat data
  function prepareData(rawData) {
    const seriesData = [];

    let reachedMaxDepth = 0;

    function convert(source, parent, depth) {
      if (source == null) {
        return;
      }
      if (depth > allowedMaxDepth) {
        return;
      }

      reachedMaxDepth = Math.max(reachedMaxDepth, depth);
      let newNode = {
        id: source.id,
        name: source.name,
        parentId: parent != null ? parent.id : null,
        value: 1, //set the value to 1, so all circles have the same size/weight
        depth: depth,
        index: seriesData.length,
        itemStyle: source.itemStyle,
        uri: source.title,
      };

      seriesData.push(newNode);

      //make a new recursion if the node has children nodes
      if (source.children && source.children.length > 0) {
        for (let child of source.children) {
          convert(child, source, depth + 1);
        }
      }
    }
    convert(rawData, null, 0);

    return {
      seriesData: seriesData,
      maxDepth: reachedMaxDepth,
    };
  }

  let all; //all Nodes

  function initChart(seriesData, maxDepth) {
    var displayRoot = stratify();

    all = displayRoot.descendants();

    function stratify() {
      return d3
        .stratify()
        .parentId(function (d) {
          return d.parentId;
        })(seriesData)
        .sum(function (d) {
          return d.value || 1;
        })
        .sort(function (a, b) {
          return b.value - a.value;
        });
    }

    function overallLayout(params, api) {
      drawStack(displayRoot);
      var context = params.context;
      d3
        .pack()
        .size([api.getWidth() - 2, api.getHeight() - 2])
        .padding(3)(displayRoot);
      context.nodes = {};
      displayRoot.descendants().forEach(function (node) {
        context.nodes[node.id] = node;
      });
    }
    const colorsLookUp = new Map();

    function renderItem(params, api) {
      var context = params.context;

      // Only do that layout once in each time `setOption` called.
      if (!context.layout) {
        context.layout = true;
        overallLayout(params, api);
      }

      var nodePath = api.value("id");
      var node = context.nodes[nodePath];
      if (!node) {
        // Render nothing.
        return;
      }

      var isLeaf = !node.children || !node.children.length;

      //on hover highlight complete subtree
      var focus = new Uint32Array(
        node.descendants().map(function (node) {
          return node.data.index;
        }),
      );
      var nodeName = node.data.name;
      var z2 = api.value("depth") * 2;

      const color = node.data.itemStyle.color || api.visual("color");
      colorsLookUp.set(node.data.id, color);

      return {
        type: "circle",
        focus: focus,
        shape: {
          cx: node.x,
          cy: node.y,
          r: node.r,
        },
        transition: ["shape"],
        z2: z2,
        textContent: {
          type: "text",
          style: {
            transition: isLeaf ? "fontSize" : null,
            text: nodeName.replace(/ /g, "\n"),
            width: node.r * 1.3,
            overflow: "truncate",
            fontSize: isLeaf ? node.r / 3 : 0,
            color: "grey",
          },
          emphasis: {
            style: {
              overflow: null,
              fontSize: isLeaf ? Math.max(node.r / 3, 24) : 0,
              color: "grey",
            },
          },
        },
        textConfig: {
          position: "inside",
        },
        style: {
          fill: node.data.itemStyle.color || api.visual("color"),
        },
        emphasis: {
          style: {
            fontSize: 12,
            shadowBlur: 20,
            shadowOffsetX: 3,
            shadowOffsetY: 5,
            shadowColor: "rgba(0,0,0,0.3)",
          },
        },
      };
    }

    function nodeText(text) {
      if (text.startsWith("https://") && text.length > 20) {
        return text.substring(0, 20) + "...";
      }
      return text;
    }

    function drawStack(node) {
      let text = null;
      while (node) {
        text = text != null ? " | " + text : "";
        text = nodeText(node.data.name) + text;
        let parentId = node.data.parentId;
        node = all.find(function (n) {
          return n.data.id === parentId;
        });
      }
      document.getElementById("stackContent").innerHTML = text;
    }

    let backgroundColor = "#fff";

    option = {
      dataset: {
        source: seriesData,
      },

      tooltip: {
        trigger: "item",
        backgroundColor: "#ffffff",
        borderRadius: 6,
        padding: 10,
        textStyle: {
          color: "#3f3f3f",
          fontSize: 16,
        },
        formatter: function (params) {
          const data = params.data;
          return `
            <div style="
              min-width:10px;
              padding:0.25rem;
              display:flex;
              align-items:center;
              justify-content:center;
              gap:0.5rem;
              ">
              <div style="
                width:10px;
                height:10px;
                border-radius:50%;
                background-color:${colorsLookUp.get(data.id)};
                flex-shrink:0;
              "></div>
              <p style="
                margin:0;
                text-align:center;
              ">
                ${data.name}
              </p>
            </div>
          `;
        },
      },

      visualMap: [
        {
          show: false,
          min: 0,
          max: maxDepth,
          dimension: "depth",
          inRange: {
            color: ["#838383", "#e0e0e0"],
          },
        },
      ],

      hoverLayerThreshold: Infinity,

      series: {
        type: "custom",
        renderItem: renderItem,
        progressive: 0,
        coordinateSystem: "none",
        encode: {
          tooltip: "name",
        },
      },
    };
    myChart.setOption(option);

    myChart.on("click", { seriesIndex: 0 }, function (params) {
      drillDown(params.data.id);
    });

    myChart.on("mousedown", { seriesIndex: 0 }, function (params) {
      const mouseEvent = params.event.event;

      if (mouseEvent.button === 2) {
        // right click
        const uri = params.data?.uri;
        if (uri) {
          window.open(uri, "_blank", "noopener,noreferrer");
        }
      }
    });

    const zr = myChart.getZr();

    const bgRect = new echarts.graphic.Rect({
      shape: {
        x: 0,
        y: 0,
        width: zr.getWidth(),
        height: zr.getHeight(),
      },
      z: -10,
      style: {
        fill: backgroundColor,
        cursor: "pointer",
      },
      onclick: function () {
        drillDown(); // zoom out
      },
    });
    bgRect.on("mouseover", function () {
      bgRect.style.opacity = 0.75;
      bgRect.dirty();
    });

    bgRect.on("mouseout", function () {
      bgRect.style.opacity = 1;
      bgRect.dirty();
    });
    zr.add(bgRect);

    function drillDown(targetNodeId) {
      let dr = displayRoot;
      displayRoot = stratify();
      if (targetNodeId == null) {
        if (dr.data.parentId != null) targetNodeId = dr.data.parentId;
      }
      if (targetNodeId != null) {
        displayRoot = displayRoot.descendants().find(function (node) {
          return node.data.id === targetNodeId;
        });
      }

      parent = all.find(
        (circle) => circle.data.id === displayRoot.data.parentId,
      );

      backgroundColor = parent ? colorsLookUp.get(parent.data.id) : "#fff";
      bgRect.style.fill = backgroundColor;

      drawStack(displayRoot);
      // A trick to prevent d3-hierarchy from visiting parents in this algorithm.
      displayRoot.parent = null;
      myChart.setOption({
        dataset: {
          source: seriesData,
        },
      });
    }

    // Reset: click on the blank area.
    myChart.getZr().on("click", function (event) {
      if (!event.target) {
        drillDown();
      }
    });
  }

  function drawControls() {
    const text = `
        <p class="m-0 font-weight-bold">Navigation:</p>
        <p class="m-0">
          <span class="font-italic">left mouse button: </span>
          click on a circle to zoom in. click on the background to zoom out
        </p>
        <p class="m-0">
          <span class="font-italic">right mouse button: </span>
          click on a circle to get to the corresponding thesaurus page
        </p>
    `;
    document.getElementById("controls").innerHTML = text;
  }

  drawControls();
  const dataWrap = prepareData(rawData);
  initChart(dataWrap.seriesData, dataWrap.maxDepth);
};
