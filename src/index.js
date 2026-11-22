/*
 * snapWONDERS API — Result renderer (JavaScript)
 * API version: 1.0
 *
 * Copyright (c) 2026 Kenneth Springer @ snapWONDERS. MIT Licensed — see LICENSE.
 * The MIT licence covers this client library only; the snapWONDERS API it calls is proprietary.
 *
 * Author: Kenneth Springer @ snapWONDERS <kenneth@snapwonders.com> (https://kennethbspringer.au)
 *
 * All the snapWONDERS API services are available over the Clearnet / **Web** and Dark Web **Tor** and **I2P**
 * Read details: https://snapwonders.com/developers
 */

/**
 * @snapwonders/report — draws a snapWONDERS analyse result as a card.
 * Importing this module registers <snapwonders-report> in a browser.
 */

import { defineSnapwondersReport } from './element.js';

export * from './model.js';
export { SnapwondersReport, renderCard, defineSnapwondersReport } from './element.js';

defineSnapwondersReport();
