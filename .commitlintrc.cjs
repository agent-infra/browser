/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
const packages = [
  'all',
  'config',
  'browser',
  'browser-context',
  'browser-finder',
  'browser-ui',
  'media-utils',
];

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-empty': [0, 'always'],
    'scope-enum': [1, 'always', packages],
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'style',
        'fix',
        'docs',
        'chore',
        'refactor',
        'ci',
        'test',
        'revert',
        'perf',
        'release',
        'tweak',
      ],
    ],
  },
};
