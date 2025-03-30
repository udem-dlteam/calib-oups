# Calib-oups

Calibration app and recording app for the OUPS! connected object. To access the apps, go to the following link:

- [Recording app](https://udem-dlteam.github.io/calib-oups/record)
- [Calibration app](https://udem-dlteam.github.io/calib-oups/calibrate)

# Older versions

These versions are no longer maintained but kept to make it work with older devices.

- [Recording App v1.0.4](https://udem-dlteam.github.io/calib-oups/v1.0.4/record)
- [Calibration App v1.0.4](https://udem-dlteam.github.io/calib-oups/v1.0.4/calibrate)
- [Recording App v1.0.3](https://udem-dlteam.github.io/calib-oups/v1.0.3/record)
- [Calibration App v1.0.3](https://udem-dlteam.github.io/calib-oups/v1.0.3/calibrate)

# Development

The app is already available online through github pages (on push to main). The following instructions describe
development steps to modify the app.

## How to run locally

To deploy the application, simply host the index.html with the associated files on a web server. To ease development,
you can use a "live server" to change the webpage in real time.
See [live server](https://www.npmjs.com/package/live-server) for more information.

You can also use python with `python -m http.server` or any other web server of your choice.

## Changelogs

- v1.0.5(2025-03-30):
  * Simplify the recoding UI to avoid forgetting to click on the "clear" button.
  * Add gravity effect characteristic.
  * Add the force before the gravity correction in the calibration app for debugging.
  * Detect board inversion while performing the force calibration and write it to the device.
- v1.0.4(2025-03-24):
  * Fix bug with scrolling bar when zoomed in
  * Fix bug where battery information wasn't displayed in the calibration app
  * Add time to recoding app
  * Rearrange the layout of the recoding app for better usability
  * Add a warning when the firmware version is not up to date
  * Modify calibration app to accomodate new, non-linear, calibration procedure
- v1.0.3(2024-01-12):
  * Improve the calculation of hz in the calibration app.
  * Add the possibility to change the serial number.
  * Add a procedure to authenticate the device in the web interface (and validate the password).
- v1.0.2(2024-10-25):
  * Added temperature and battery information to the calibration app.
  * Added temperature information to recordings.
- v1.0.1(2024-08-16):
  * Added battery information to recordings
  * Added bias and slope information to calibration app.
  * Reduced CSV size by stripping values to 4 decimals when recoding.
- v1.0.0(2024-07-31): Initial release
