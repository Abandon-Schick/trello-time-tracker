// Time Tracker Power-Up — capability handlers
// Data model: on each card, shared plugin data stores:
//   estimate    (number, hours)
//   spent       (number, hours, running total)
//   timerStart  (ISO string, present only while the stopwatch is running)

function fmtHrs(h) {
  h = parseFloat(h) || 0;
  return (Math.round(h * 100) / 100).toString();
}

window.TrelloPowerUp.initialize(
  {
    "card-badges": function (t) {
      return t.get("card", "shared").then(function (data) {
        data = data || {};
        var badges = [];
        if (data.estimate) {
          badges.push({ text: "Est " + fmtHrs(data.estimate) + "h", color: "blue" });
        }
        if (data.spent) {
          badges.push({
            text: (data.timerStart ? "⏱ " : "") + fmtHrs(data.spent) + "h spent",
            color: data.timerStart ? "red" : "light-gray"
          });
        } else if (data.timerStart) {
          badges.push({ text: "⏱ running", color: "red" });
        }
        return badges;
      });
    },

    "card-detail-badges": function (t) {
      return t.get("card", "shared").then(function (data) {
        data = data || {};
        return [
          {
            title: "Estimated",
            text: data.estimate ? fmtHrs(data.estimate) + "h" : "Not set",
            callback: function (t) {
              return t.popup({
                title: "Set Estimate",
                url: "./popup-estimate.html",
                height: 260
              });
            }
          },
          {
            title: "Time spent",
            text: fmtHrs(data.spent) + "h" + (data.timerStart ? " (timer running)" : ""),
            callback: function (t) {
              return t.popup({
                title: "Log Time",
                url: "./popup-logtime.html",
                height: 420
              });
            }
          }
        ];
      });
    },

    "card-buttons": function (t) {
      return [
        {
          icon: ICON_LIGHT,
          text: "Set Estimate",
          callback: function (t) {
            return t.popup({
              title: "Set Estimate",
              url: "./popup-estimate.html",
              height: 140
            });
          }
        },
        {
          icon: ICON_LIGHT,
          text: "Log Time",
          callback: function (t) {
            return t.popup({
              title: "Log Time",
              url: "./popup-logtime.html",
              height: 360
            });
          }
        },
        {
          icon: ICON_LIGHT,
          text: "Timer",
          callback: function (t) {
            return t.popup({
              title: "Timer",
              url: "./popup-timer.html",
              height: 220
            });
          }
        }
      ];
    },

    "board-buttons": function (t) {
      return [
        {
          icon: { dark: ICON_DARK, light: ICON_LIGHT },
          text: "Time Report",
          callback: function (t) {
            return t.popup({
              title: "Time Report",
              url: "./popup-report.html",
              height: 560,
              width: 640
            });
          }
        }
      ];
    }
  },
  {
    appKey: TIME_TRACKER_CONFIG.APP_KEY,
    appName: TIME_TRACKER_CONFIG.APP_NAME
  }
);
