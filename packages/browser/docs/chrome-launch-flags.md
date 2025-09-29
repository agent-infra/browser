**@agent-infra/browser** uses **puppeteer-core** at the bottom to control the browser, so it reuses its Chrome launch parameters.

puppeteer can control Chrome's launch behavior through parameters like `args` in [`puppeteer.launch`](https://pptr.dev/api/puppeteer.launchoptions). For specific logic and parameters, refer to the source code [puppeteer - ChromeLauncher.ts](https://github.com/puppeteer/puppeteer/blob/main/packages/puppeteer-core/src/node/ChromeLauncher.ts).

In addition to the built-in parameters of **puppeteer-core**, **@agent-infra/browser** also adds the following parameters by default to optimize the browser usage experience:

| Parameters                                                      | Description                                                        |
| --------------------------------------------------------------- | ------------------------------------------------------------------ |
| `--mute-audio`                                                  | Mute any audio                                                     |
| `--no-default-browser-check`                                    | Disable the default browser check, do not prompt to set it as such |
| `--ash-no-nudges`                                               | Avoids blue bubble "user education" nudges                         |
| `--window-size=defaultViewport.width,defaultViewport.height+90` | Sets the initial window size.                                      |

And the following **puppeteer-core** parameters are ignored by default:

| Parameters            | Description                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------- |
| `--enable-automation` | Avoid the prompt "Chrome is being controlled by automated software" when the browser starts |


<br />

To learn more about Chrome launch flags, you can refer to the following link:

- [Chrome Flags for Tooling](https://github.com/GoogleChrome/chrome-launcher/blob/main/docs/chrome-flags-for-tools.md)
- [List of Chromium Command Line Switches](https://peter.sh/experiments/chromium-command-line-switches/)

