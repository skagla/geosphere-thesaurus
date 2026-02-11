eCharts_sunburstChart = function (data, elementId) {
  let chartDom = document.getElementById(elementId);

  //prevent default right click behavior
  chartDom.oncontextmenu = function (e) {
    e.preventDefault();
  };

  let myChart = echarts.init(chartDom, null, {
    renderer: "svg",
  });
  function outputsize() {
    myChart.resize();
  }
  new ResizeObserver(outputsize).observe(chartDom);

  data = data.children;

  const option = {
    series: {
      type: "sunburst",
      data: data,
      radius: [0, "95%"],
      label: {
        show: true,
      },
      itemStyle: {
        borderWidth: 2,
        color: "#fff",
      },
      label: {
        align: "right",
      },
      emphasis: {
        focus: "ancestor",
      },
    },
    tooltip: {
      formatter: function (params) {
        if (params.treePathInfo?.length === 1) {
          return "Click to zoom out";
        }
        return `${params.name}`;
      },
    },
  };

  let option_old = {
    title: {
      text: "",
      subtext: "",
      textStyle: {
        fontSize: 14,
        align: "center",
        color: "black",
      },
      subtextStyle: {
        align: "center",
      },
    },
    series: {
      type: "sunburst",
      data: data,
      radius: [0, "95%"],
      sort: undefined,
      emphasis: {
        focus: "ancestor",
      },
      levels: [
        {},
        {
          r0: "15%",
          r: "35%",
          itemStyle: {
            borderWidth: 2,
          },
          label: {
            //rotate: 'tangential'
            align: "right",
            color: "black",
            fontSize: 11,
          },
        },
        {
          r0: "35%",
          r: "70%",
          label: {
            align: "right",
            color: "black",
            fontSize: 11,
          },
        },
        {
          r0: "70%",
          r: "72%",
          label: {
            position: "outside",
            padding: 3,
            silent: false,
            color: "black",
            fontSize: 11,
          },
          itemStyle: {
            borderWidth: 3,
          },
        },
      ],
    },
  };

  function drawControls() {
    const text = `
        <p class="m-0 font-weight-bold">Navigation:</p>
        <p class="m-0">
          <span class="font-italic">left mouse button: </span>
          click on a pie to zoom in. click on the center to zoom out
        </p>
        <p class="m-0">
          <span class="font-italic">right mouse button: </span>
          click on a circle to get to the corresponding thesaurus page
        </p>
    `;
    document.getElementById("controls").innerHTML = text;
  }

  drawControls();

  option && myChart.setOption(option);
  myChart.on("mousedown", { seriesIndex: 0 }, function (params) {
    const mouseEvent = params.event.event;

    // right click
    if (mouseEvent.button === 2) {
      const uri = params.data?.title;
      if (uri) {
        window.open(uri, "_blank", "noopener,noreferrer");
      }
    }
  });
};
