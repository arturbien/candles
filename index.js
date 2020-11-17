function clamp(a, min = 0, max = 1) {
  return Math.min(max, Math.max(min, a));
}
function invlerp(x, y, a) {
  return clamp((a - x) / (y - x));
}

class Chart {
  constructor(data) {
    this.data = data;

    this.canvas = document.getElementById("kline");
    this.ctx = this.canvas.getContext("2d");
    this._updateCanvasSize();

    this.PIXEL_RATIO = window.devicePixelRatio;
    this.CANDLE_WIDTH = 4 * this.PIXEL_RATIO;
    this.SPACING = 2 * this.PIXEL_RATIO;
    this.FONT_SIZE = 10 * this.PIXEL_RATIO;
    // distance between right edge of the canvas to Y axis
    this.Y_AXIS_OFFSET = 80 * this.PIXEL_RATIO;
    // distance between right most data point and Y axis
    this.CANDLE_AXIS_OFFSET = 10 * this.PIXEL_RATIO;

    this.COLORS = {
      green: "#2cbe84",
      red: "#df2b49",
      gray: "#4f5863",
      darkGray: "#15161b",
    };

    this.draw();
    // TODO use ResizeObserver if browser supports it
    window.onresize = this.draw;
  }

  // returns width of a time unit in px
  get timeUnitWidth() {
    return this.CANDLE_WIDTH + this.SPACING;
  }

  setData(data) {
    this.data = data;
    this.draw();
  }

  // scales values to corresponding canvas coordinates
  _scaleData(data) {
    // find lowest and highest data point
    const max = Math.max(...data.map((dataPoint) => dataPoint[2]));
    const min = Math.min(...data.map((dataPoint) => dataPoint[3]));

    // scale data to canvas size
    const scaledData = data.map((dataPoint, timeUnit) => {
      const [, open, high, low, close] = dataPoint;
      // drawing candles from right to left
      const x = this.canvasWidth - timeUnit * this.timeUnitWidth;

      return [
        x,
        this._mapValueToCanvasHeight(min, max, open),
        this._mapValueToCanvasHeight(min, max, high),
        this._mapValueToCanvasHeight(min, max, low),
        this._mapValueToCanvasHeight(min, max, close),
      ];
    });

    return scaledData;
  }

  _mapValueToCanvasHeight(min, max, value) {
    return invlerp(min, max, value) * this.canvasHeight;
  }

  _updateCanvasSize() {
    const {
      width: canvasWidth,
      height: canvasHeight,
    } = this.canvas.getBoundingClientRect();

    this.canvasWidth = canvasWidth * this.PIXEL_RATIO;
    this.canvasHeight = canvasHeight * this.PIXEL_RATIO;
    this.ctx.height = canvasWidth * this.PIXEL_RATIO;
    this.ctx.width = canvasHeight * this.PIXEL_RATIO;
    this.canvas.setAttribute("width", canvasWidth * this.PIXEL_RATIO + "px");
    this.canvas.setAttribute("height", canvasHeight * this.PIXEL_RATIO + "px");
  }

  _text({ x, y, text, color }) {
    this.ctx.font = `${this.FONT_SIZE}px arial`;
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x, y);
  }

  _line({ aX, aY, bX, bY, color, thickness = 1 }) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = thickness;

    this.ctx.beginPath();
    this.ctx.moveTo(aX, aY);
    this.ctx.lineTo(bX, bY);
    this.ctx.stroke();
  }

  _rect({ x, y, width, height, color }) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
  }

  _drawCandle({ x, open, high, low, close }) {
    // green if bullish, red if bearish
    const candleColor = open > close ? this.COLORS.red : this.COLORS.green;

    // draw candle shadow
    const shadowWidth = 1;
    this._rect({
      x: x - shadowWidth / 2,
      y: this.canvasHeight - high,
      width: shadowWidth,
      height: high - low,
      color: candleColor,
    });

    // draw candle body
    const bodyTop = Math.max(open, close);
    const bodyBottom = Math.min(open, close);

    this._rect({
      x: x - this.CANDLE_WIDTH / 2,
      y: this.canvasHeight - bodyTop,
      width: this.CANDLE_WIDTH,
      height: bodyTop - bodyBottom,
      color: candleColor,
    });
  }

  _drawYAxis() {
    const x = this.canvasWidth - this.Y_AXIS_OFFSET;
    this._line({
      aX: x,
      aY: 0,
      bX: x,
      bY: this.canvasHeight,
      color: this.COLORS.gray,
    });
  }

  _drawYAxisValues({ min, max, currentOpen, currentClose }) {
    const TICK_MARK_LENGTH = 8 * this.PIXEL_RATIO;
    const TICK_LABEL_OFFSET = 4 * this.PIXEL_RATIO;
    const LABELS_SPACING = 2 * this.FONT_SIZE;

    // TODO display labels rounded to even step values
    // like 0.1, 0.2, 0.5, 1, 2, 5, 10, 20 ... etc
    // and figure out maxLabelsNumber based on the step
    let maxLabelsNumber = Math.ceil(
      this.canvasHeight / (this.FONT_SIZE + LABELS_SPACING)
    );
    const step = (max - min) / (maxLabelsNumber - 1);

    // drawing Y axis labels from the min value up
    const ticks = new Array(maxLabelsNumber)
      .fill(null)
      .map((_, i) => (min + i * step).toFixed(2));

    ticks.reverse().forEach((value) => {
      const x = this.canvasWidth - this.Y_AXIS_OFFSET;
      const y = this.canvasHeight - this._mapValueToCanvasHeight(min, max, value);

      this._line({
        aX: x,
        aY: y,
        bX: x + TICK_MARK_LENGTH,
        bY: y,
        color: this.COLORS.gray,
      });

      this._text({
        x: x + TICK_MARK_LENGTH + TICK_LABEL_OFFSET,
        y,
        text: value,
        color: this.COLORS.gray,
      });
    });

    // draw current value label
    const currentValueLabelColor =
      currentOpen > currentClose ? this.COLORS.red : this.COLORS.green;

    const currentValue = currentClose.toFixed(2);

    const x = this.canvasWidth - this.Y_AXIS_OFFSET;
    const y =
      this.canvasHeight - this._mapValueToCanvasHeight(min, max, currentValue);

    this._line({
      aX: x,
      aY: y,
      bX: x + TICK_MARK_LENGTH,
      bY: y,
      color: currentValueLabelColor,
    });

    this._text({
      x: x + TICK_MARK_LENGTH + TICK_LABEL_OFFSET,
      y,
      text: currentValue,
      color: currentValueLabelColor,
    });
  }

  draw = () => {
    this._updateCanvasSize();

    // see how many data points will fit into a canvas
    const maxCandlesNumber = Math.ceil(
      (this.canvasWidth - this.Y_AXIS_OFFSET) / this.timeUnitWidth
    );
    // get data points starting from the most recent
    const data = [...this.data].reverse().splice(0, maxCandlesNumber);

    this._rect({
      x: 0,
      y: 0,
      width: this.canvasWidth,
      height: this.canvasHeight,
      color: this.COLORS.darkGray,
    });

    // scale data to canvas size
    const scaledData = this._scaleData(data);

    scaledData.forEach(([x, open, high, low, close]) => {
      this._drawCandle({ x: x - this.Y_AXIS_OFFSET - this.CANDLE_AXIS_OFFSET, open, high, low, close });
    });

    this._drawYAxis();

    // find lowest and highest data point
    const max = Math.max(...data.map((dataPoint) => dataPoint[2]));
    const min = Math.min(...data.map((dataPoint) => dataPoint[3]));

    const latestDataPoint = data[0];
    const currentOpen = latestDataPoint[1];
    const currentClose = latestDataPoint[4];

    this._drawYAxisValues({
      min: min,
      max: max,
      currentOpen,
      currentClose,
    });
  };
}

class DataService {
  constructor(data) {
    this.data = data;
    this.subscribers = [];
  }

  subscribe(callback) {
    this.subscribers.push(callback);
  }

  _notifyListeners() {
    this.subscribers.forEach((callback) => callback(this.getData()));
  }

  setData(newData) {
    this.data = newData;
  }

  getData() {
    return this.data;
  }

  _getLatestValue() {
    return this.data[this.data.length - 1];
  }

  handleStream(newValue) {
    // compare timestamps
    const isNewMinute = this._getLatestValue()[0] !== newValue[0];
    if (isNewMinute) {
      this.data.push(newValue);
    } else {
      this.data.pop();
      this.data.push(newValue);
    }
    this._notifyListeners();
  }
}

function parseData(dataPoint) {
  const [timestamp, open, high, low, close] = dataPoint;
  return [
    timestamp,
    parseFloat(open),
    parseFloat(high),
    parseFloat(low),
    parseFloat(close),
  ];
}

(async function () {
  const seriesData = await fetchSeriesData();

  const dataService = new DataService(seriesData.map(parseData));

  const chart = new Chart(dataService.getData());
  dataService.subscribe((newData) => chart.setData(newData));

  subcribe((data) => {
    dataService.handleStream(parseData(data));
  });

  function fetchSeriesData() {
    return new Promise((resolve, reject) => {
      fetch("https://www.binance.com/api/v1/klines?symbol=BTCUSDT&interval=1m")
        .then(async (res) => {
          const data = await res.json();
          const result = data.map(([time, open, high, low, close]) => [
            time,
            open,
            high,
            low,
            close,
          ]);
          resolve(result);
        })
        .catch((e) => reject(e));
    });
  }

  function subcribe(success) {
    try {
      const socket = new WebSocket(
        "wss://stream.binance.com/stream?streams=btcusdt@kline_1m"
      );
      socket.onmessage = (e) => {
        const res = JSON.parse(e.data);
        const { t, o, h, l, c } = res.data.k;
        success([t, o, h, l, c]);
      };
    } catch (e) {
      console.error(e.message);
    }
  }
})();
