"use strict";
/* Shared test helpers. */

/** A build context backed by the real doc map (lazy, no full build needed). */
exports.ctx = function ctx() {
  return { mapLink: hrefFor };
};

function hrefFor(url) {
  const { pageHref } = require("../build.js");
  return pageHref(url, "");
}

exports.mapLink = hrefFor;
