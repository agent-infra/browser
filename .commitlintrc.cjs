/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
const fs = require('fs');
const path = require('path');

function getPackageScopes() {
  const packagesDir = path.join(process.cwd(), 'packages');
  if (!fs.existsSync(packagesDir)) {
    return ['all'];
  }

  const scopes = ['all'];
  const items = fs.readdirSync(packagesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  return [...scopes, ...items];
}

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-empty': [2, 'never'],
    'scope-enum': [2, 'always', getPackageScopes()],
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
