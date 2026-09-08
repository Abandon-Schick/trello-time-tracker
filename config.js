/*
 * EDIT THIS FILE after you register the Power-Up in Trello's admin portal.
 * See README.md, step 3, for exactly where APP_KEY comes from.
 */
var TIME_TRACKER_CONFIG = {
  // Your Power-Up's generated API Key, from trello.com/power-ups/admin
  // -> your Power-Up -> API Key. Only needed for the "Time Report" button
  // (feature 2), which is the only part that reads OTHER cards' data.
  APP_KEY: "897ab283806140e699a56f8398433da3",
  APP_NAME: "Punch Card",
  APP_AUTHOR: "Christian Schick"
};

// A single small clock icon, reused for both light and dark Trello themes.
// Swap these data URIs for your own icon later if you want — this is just
// functional, not fancy.
var ICON_DARK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>" +
      "<circle cx='12' cy='12' r='9' fill='none' stroke='white' stroke-width='2'/>" +
      "<path d='M12 7v5l3.5 2' stroke='white' stroke-width='2' fill='none' stroke-linecap='round'/>" +
      "</svg>"
  );
var ICON_LIGHT =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>" +
      "<circle cx='12' cy='12' r='9' fill='none' stroke='black' stroke-width='2'/>" +
      "<path d='M12 7v5l3.5 2' stroke='black' stroke-width='2' fill='none' stroke-linecap='round'/>" +
      "</svg>"
  );
