// Browser bundle for the GitHub Pages site: React, ReactDOM and the component in one script, exposed as the same
// globals the demo page's inline script uses when it runs as an artifact (React and ReactDOM from a CDN there).
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { LivingCity, resolveTheme, watchTheme } from '../src';

Object.assign(window, { React, ReactDOM: { createRoot }, LivingCityLib: { LivingCity, resolveTheme, watchTheme } });
