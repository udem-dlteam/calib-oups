// Copyright: Marc Feeeey, 2024
// Copyright: Léonard Oest O'Leary, 2024
// v1: April 10, 2024
// v2: July 4, 2024

// ==================
// == UI functions ==
// ==================

function ui_setup(){
  ui_setup_force_calibration_menu();
  ui_setup_accel_calibration_menu();
  ui_setup_other_configs_menu();
  ui_state_set('disconnected');
}

    //enum GyroFS : uint8_t {
    //  dps2000 = 0x00,
    //  dps1000 = 0x01,
    //  dps500 = 0x02,
    //  dps250 = 0x03,
    //  dps125 = 0x04, // default
    //  dps62_5 = 0x05,
    //  dps31_25 = 0x06,
    //  dps15_625 = 0x07
    //};

    //enum AccelFS : uint8_t {
    //  gpm16 = 0x00,
    //  gpm8 = 0x01,
    //  gpm4 = 0x02, // default
    //  gpm2 = 0x03
    //};


let OTHER_CONFIGS = [
  {
    name: 'Accelerometer Range',
    key: 'accel_range',
    possibilities: [
      ['2g', 3], 
      ['4g', 2], 
      ['8g', 1],
      ['16g', 0]
    ],
    on_device_value: false,
    value : 3
  },
  {
    name: 'Gyro Range',
    key: 'gyro_range',
    possibilities: [
      ['15.625°/s', 7],
      ['31.25°/s', 6],
      ['62.5°/s', 5],
      ['125°/s', 4],
      ['250°/s', 3],
      ['500°/s', 2],
      ['1000°/s', 1],
      ['2000°/s', 0]
    ],
    on_device_value: false,
    value : 7
  },
  {
    name: 'Refresh rate',
    key: 'refresh_rate',
    possibilities: 
    [
      ['10Hz', 10], 
      ['25Hz', 25],
      ['50Hz', 50],
      ['100Hz', 100]
    ],
    on_device_value: false,
    value : 10
  }
];


function ui_setup_other_configs_menu(){
  let container = document.querySelector('#ui_other_configs_menu');
  container.innerHTML = '';

  for (let config of OTHER_CONFIGS){
    let row = document.createElement('div');
    row.classList.add('ui_calibration_menu_row');

    // Label
    let label = document.createElement('div');
    label.innerHTML = config.name;
    row.appendChild(label);

    // Select
    let select = document.createElement('select');
    select.classList.add('ui_other_config_select');
    select.id = 'ui_other_config_' + config.key;
    select.onchange = function(){
      let value = parseInt(this.value);
      config.value = value;
    }
    row.appendChild(select);

    container.appendChild(row);
  }

  ui_update_config_selects();
}

function ui_update_config_selects(){
  for (let config of OTHER_CONFIGS){
    let select = document.querySelector('#ui_other_config_' + config.key);
    select.innerHTML = '';

    for (let [name, value] of config.possibilities){
      let option = document.createElement('option');
      option.value = value;
      if (config.on_device_value === value){
        option.innerText = "*" + name + "*";
      }
      else{
        option.innerText = name;
      }
      select.appendChild(option);
    }

    select.value = config.value;
  }

}


function set_initial_value(key, value){
  let select = OTHER_CONFIGS.find(x => x.key === key)
  select.on_device_value = value;
  select.value = value;
  ui_update_config_selects();
}


let standard_weights = [0, 10, 20, 50, 100, 200, 500, 1000]
function ui_setup_force_calibration_menu(){
  let container = document.querySelector('#ui_force_calibration');
  if (container){
    for (let weight of standard_weights){
      let row = document.createElement('div');
      row.classList.add('ui_calibration_menu_row');

      // Checkbox
      let checkbox = document.createElement('input');
      checkbox.classList.add('ui_calibration_checkbox');
      checkbox.classList.add('ui_force_checkbox');
      checkbox.type = 'checkbox';
      //checkbox.innerText = "set";
      checkbox.onchange = function(){
        input_set_calibration_at_weight(weight, this.checked);
      }
      checkbox.disabled = true;
      row.appendChild(checkbox);

      // Weight label
      let weight_text = document.createElement('div');
      weight_text.innerText = weight + 'g';
      row.appendChild(weight_text);

      // Raw force
      let raw_text = document.createElement('div');
      raw_text.id = 'ui_weight_raw_' + weight;
      raw_text.innerText = NA_string;
      row.appendChild(raw_text);

      // Calibrated force
      let calibrated_text = document.createElement('div');
      calibrated_text.id = 'ui_weight_calibrated_' + weight;
      calibrated_text.innerText = NA_string;
      row.appendChild(calibrated_text);

      container.appendChild(row);
    }
  }
}

let accel_directions = ['x','y','z'];
function ui_setup_accel_calibration_menu(){
  let container = document.querySelector('#ui_accel_calibration');
  if (container){
    for (let raw_direction of accel_directions){
      let row = document.createElement('div');
      row.classList.add('ui_calibration_menu_row');

      for (let sign of ['', '-']){
        let direction = sign + raw_direction;
        // Checkbox
        let checkbox = document.createElement('input');
        checkbox.classList.add('ui_calibration_checkbox');
        checkbox.classList.add('ui_accel_checkbox');
        checkbox.classList.add('ui_accel_checkbox_' + direction)
        checkbox.type = 'checkbox';
        //checkbox.innerText = "set";
        checkbox.onchange = function(){
          input_set_calibration_at_direction(direction, this.checked);
        }
        checkbox.disabled = true;
        row.appendChild(checkbox);

        // Direction label
        let direction_text = document.createElement('div');
        direction_text.classList.add('ui_text_direction_' +direction);
        direction_text.innerText = direction;
        row.appendChild(direction_text);

        // Raw direction
        let raw_text = document.createElement('div');
        raw_text.id = 'ui_direction_raw_' + direction;
        raw_text.innerText = NA_string;
        row.appendChild(raw_text);
      
      }

      container.appendChild(row);
    }
  }
}


function ui_state_set(state){
  if(!["connected", "connecting", "disconnected"].includes(state)){
    throw new Error('Invalid state');
  }

  let main = document.querySelector('.ui');
  if (main){
    main.setAttribute('data-state', state);
  }

  // Calibrate button
  let button = document.querySelector('#ui_calibrate_button');
  if (button){
    button.disabled = state !== 'connected';
  }
  
  if (state === 'disconnected'){
    ui_set_enable_checkboxes(false, '.ui_calibration_checkbox');
  }

  // Other configs
  for (let config of OTHER_CONFIGS){
    let select = document.querySelector('#ui_other_config_' + config.key);
    select.disabled = state !== 'connected';
  }

  //// units
  //let units = document.querySelectorAll('.ui_unit');
  //if (units){
  //  for (let unit of units){
  //    unit.disabled = state !== 'connected';
  //    if (state !== 'connected'){
  //      unit.innerText = 'N/A';
  //    }
  //  }
  //}
}


function ui_unset_calibrated_force(){
  let arrow_container = document.querySelector('#ui_arrow_container');
  arrow_container.setAttribute("hidden", true);

  let force_container = document.querySelector('#ui_calibrated_force_container');
  force_container.setAttribute("hidden", true);

}

function ui_set_calibrated_force(force){
  let arrow_container = document.querySelector('#ui_arrow_container');
  arrow_container.removeAttribute("hidden");

  let force_container = document.querySelector('#ui_calibrated_force_container');
  force_container.removeAttribute("hidden");

  let force_display = document.querySelector('#ui_calibrated_force');
  force_display.innerText = force.toFixed(0);
}


const set_ui = (id, fixed=0) => 
  (value) => 
    // check if the value is a string, else asume it is a number
    document.querySelector(id).innerText = (typeof value === "string") ? value : value.toFixed(fixed);

const ui_set_captor_force = set_ui('#ui_captor_force');
const ui_set_captor_force_raw = set_ui('#ui_captor_force_raw');
//const ui_set_calibrated_force = set_ui('#ui_calibrated_force');

const ui_set_weight_raw = (weigth, force) => 
  set_ui('#ui_weight_raw_' + weigth)(force);

const ui_set_weigth_calibrated = (weigth, force) =>
  set_ui('#ui_weight_calibrated_' + weigth)(force);

const ui_set_direction_raw = (direction, force) =>
  set_ui('#ui_direction_raw_' + direction)(force);

const ui_set_direction_calibrated = (direction, force) =>
  set_ui('#ui_direction_calibrated_' + direction)(force);

const ui_set_accel_x = set_ui('#ui_accel_x', 0);
const ui_set_accel_y = set_ui('#ui_accel_y', 0);
const ui_set_accel_z = set_ui('#ui_accel_z', 0);

const ui_set_accel_x_raw = set_ui('#ui_accel_x_raw', 0);
const ui_set_accel_y_raw = set_ui('#ui_accel_y_raw', 0);
const ui_set_accel_z_raw = set_ui('#ui_accel_z_raw', 0);

const ui_set_gyro_x =  set_ui('#ui_gyro_x',  0);
const ui_set_gyro_y =  set_ui('#ui_gyro_y',  0);
const ui_set_gyro_z =  set_ui('#ui_gyro_z',  0);

const ui_set_gyro_x_raw =  set_ui('#ui_gyro_x_raw',  0);
const ui_set_gyro_y_raw =  set_ui('#ui_gyro_y_raw',  0);
const ui_set_gyro_z_raw =  set_ui('#ui_gyro_z_raw',  0);

const ui_set_gyro_bias_x =  set_ui('#ui_gyro_bias_x',  0);
const ui_set_gyro_bias_y =  set_ui('#ui_gyro_bias_y',  0);
const ui_set_gyro_bias_z =  set_ui('#ui_gyro_bias_z',  0);

const ui_set_hz = set_ui('#ui_connection_hz', 0);

// Inserts a dot at pos
const integer_to_string = (raw_accel, pos) => {
  let abs_accel = Math.abs(raw_accel);
  let paddedResult = (abs_accel+"").padStart(pos+1, '0');
  dot_position = paddedResult.length - pos;
  return (raw_accel < 0 ? "-" : "") + paddedResult.slice(0, dot_position) + '.' + paddedResult.slice(dot_position);
}

const ui_set_accel_values = (ax, ay, az, raw_ax, raw_ay, raw_az) => {
  let [slope_x, slope_y, slope_z] = accel_slope;
  let [bias_x, bias_y, bias_z] = accel_bias;

  let should_calibrate_x = (slope_x !== null && bias_x !== null)
  ui_enable_calibrated_accel(should_calibrate_x, '#ui_accel_x');
  if(should_calibrate_x){
    ax = calculate_accel_calibration(slope_x, bias_x, raw_ax)
  }

  let should_calibrate_y = (slope_y !== null && bias_y !== null)
  ui_enable_calibrated_accel(should_calibrate_y, '#ui_accel_y');
  if(should_calibrate_y){
    ay = calculate_accel_calibration(slope_y, bias_y, raw_ay)
  }

  let should_calibrate_z = (slope_z !== null && bias_z !== null)
  ui_enable_calibrated_accel(should_calibrate_z, '#ui_accel_z');
  if(should_calibrate_z){
    az = calculate_accel_calibration(slope_z, bias_z, raw_az)
  }

  ui_set_accel_x(integer_to_string(ax, 3));
  ui_set_accel_y(integer_to_string(ay, 3));
  ui_set_accel_z(integer_to_string(az, 3));
  ui_set_accel_x_raw(raw_ax);
  ui_set_accel_y_raw(raw_ay);
  ui_set_accel_z_raw(raw_az);
}

const ui_set_gyro_values = (gx, gy, gz, raw_gx, raw_gy, raw_gz) =>{

  let should_calibrate = gyro_bias.every(x => x !== null)
  ui_enable_calibrated_accel(should_calibrate, '#ui_gyro_x');
  ui_enable_calibrated_accel(should_calibrate, '#ui_gyro_y');
  ui_enable_calibrated_accel(should_calibrate, '#ui_gyro_z');

  if(should_calibrate){
    let [bias_x, bias_y, bias_z] = gyro_bias
    gx = calculate_gyro_calibration(bias_x, raw_gx)
    gy = calculate_gyro_calibration(bias_y, raw_gy)
    gz = calculate_gyro_calibration(bias_z, raw_gz)
  }

  ui_set_gyro_x(integer_to_string(gx, 1))
  ui_set_gyro_y(integer_to_string(gy, 1))
  ui_set_gyro_z(integer_to_string(gz, 1))

  ui_set_gyro_x_raw(raw_gx)
  ui_set_gyro_y_raw(raw_gy)
  ui_set_gyro_z_raw(raw_gz)
}

const NA_string = '';
const ui_update_calibration = () => {

  standard_weights.forEach(weight => {
    let is_calibrated = calibrations.has(weight);
    if (is_calibrated && calibration_slope !== null && calibration_bias !== null){
      let calibrated_force = calculate_force_calibration(calibration_slope, calibration_bias, calibrations.get(weight));
      ui_set_weigth_calibrated(weight, calibrated_force);
    }
    else{
      ui_set_weigth_calibrated(weight, NA_string);
    }
  });
}

const ui_enable_calibrated_accel = (enable, selector) => {
  let x = document.querySelector(selector);
  if (enable){
    x.classList.add('ui_calibrated');
  }
  else{
    x.classList.remove('ui_calibrated');
  }
}

const ui_set_enable_checkboxes = (enable, selector) => {
  let checkboxes = document.querySelectorAll(selector);
  checkboxes.forEach(c => c.disabled = (!enable && !c.checked) );
}

const ui_set_bold_text_direction = (enable, selector) => {
  let text = document.querySelector(selector);
  if (enable){
    text.classList.add('ui_bold');
  }
  else{
    text.classList.remove('ui_bold');
  }
}

const ui_reset_checkboxes = () => {
  let checkboxes = document.querySelectorAll('.ui_calibration_checkbox');
  checkboxes.forEach(c => c.checked = false);
}

function ui_reset_calibration(){
  calibrations.keys().forEach(weight => input_set_calibration_at_weight(weight, false));
  ui_reset_checkboxes();
  reset_calibration();
  ui_update_calibration();
}

// =======================
// == UI event handlers ==
// =======================


async function input_calibrate_button_click(){
  if (calibration_slope === null && calibration_bias === null
      && accel_slope.every(x => x === null) && accel_bias.every(x => x === null)
      && gyro_bias.every(x => x === null)
      && OTHER_CONFIGS.every(config => config.on_device_value === config.value)){
    alert('Please calibrate the device first');
    return;
  }

  [slope_x, slope_y, slope_z] = accel_slope;
  [bias_x, bias_y, bias_z] = accel_bias;

  let written = "";
  try{
    if (calibration_slope !== null && calibration_bias !== null){
      await force_slope_characteristic.writeValueWithResponse(new Int32Array([calibration_slope]));
      await force_offset_characteristic.writeValueWithResponse(new Int32Array([calibration_bias]));
      written += "force ";
    }
    if(slope_x !== null && bias_x !== null){
      await accel_scale_x_characteristic.writeValueWithResponse(new Int32Array([slope_x]));
      await accel_bias_x_characteristic.writeValueWithResponse(new Int32Array([bias_x]));
      written += "accel_x ";
    }

    if(slope_y !== null && bias_y !== null){
      await accel_scale_y_characteristic.writeValueWithResponse(new Int32Array([slope_y]));
      await accel_bias_y_characteristic.writeValueWithResponse(new Int32Array([bias_y]));
      written += "accel_y ";
    }

    if(slope_z !== null && bias_z !== null){
      await accel_scale_z_characteristic.writeValueWithResponse(new Int32Array([slope_z]));
      await accel_bias_z_characteristic.writeValueWithResponse(new Int32Array([bias_z]));
      written += "accel_z ";
    }

    if(gyro_bias.every(x => x !== null)){
      await gyro_bias_x_characteristic.writeValueWithResponse(new Int32Array([gyro_bias[0]]));
      await gyro_bias_y_characteristic.writeValueWithResponse(new Int32Array([gyro_bias[1]]));
      await gyro_bias_z_characteristic.writeValueWithResponse(new Int32Array([gyro_bias[2]]));
      written += "gyro ";
    }

    OTHER_CONFIGS.forEach((config) => {
      on_device = config.on_device_value;
      current = config.value;
      key = config.key;

      if (on_device !== current){
        let characteristic = config_characteristics.get(key);
        characteristic.writeValueWithResponse(new Uint8Array([current]));
        written += key + " ";
      }

    });

  } catch (e){
    console.error(e);
    alert("Error while writing the calibration values");
    return;
  }

  ui_reset_calibration();
  alert("The following calibration values were written to the device :" + written);
}

async function input_connection_button_click() {
  if (bluetooth_device === null) {
    await connect_device();
  } else {
    await disconnect_device();
  }
}


async function input_set_calibration_at_weight(weight, checked){
  if (checked){
    ui_set_weight_raw(weight, latest_raw_force);
    set_calibration(weight, latest_raw_force);
  }
  else{
    ui_set_weight_raw(weight, NA_string);
    unset_calibration(weight);
  }
  update_calibration();
  ui_update_calibration();
}

function direction2index(direction){
  return {
    'x': 0,
    'y': 1,
    'z': 2,
    '-x': 0,
    '-y': 1,
    '-z': 2
  }[direction];
}

async function input_set_calibration_at_direction(direction, checked){
  if (checked){
    console.log(direction, direction2index(direction), latest_raw_accel[direction2index(direction)]);
    ui_set_direction_raw(direction, latest_raw_accel[direction2index(direction)]);
    set_direction_calibration(direction, latest_raw_accel[direction2index(direction)]);
  }
  else{
    ui_set_direction_raw(direction, NA_string);
    unset_direction_calibration(direction);
  }
  update_accel_calibration();
  //ui_update_accel_calibration();
}

let gyro_bias = [null, null, null];
async function input_gyro_checkbox_click(checked){

  if(checked){
    gyro_bias = latest_raw_gyro;
  } else{
    gyro_bias = [null, null, null];
  }

  ui_set_gyro_bias_x(gyro_bias[0]);
  ui_set_gyro_bias_y(gyro_bias[1]);
  ui_set_gyro_bias_z(gyro_bias[2]);
  
}

// ================================
// == Force calibration routines ==
// ================================

const sum = (lst) => lst.reduce((a, b) => a + b, 0);
const zip = (a, b) => a.map((k, i) => [k, b[i]]);
const element_add = (a, b) => a.map((k, i) => k + b[i]);

let calibrations = new Map();
let calibration_slope = null;
let calibration_bias = null;
let scaling = 65536

function calculate_force_calibration(slope, bias, value){
  let result = (slope * value + bias + scaling/2) / scaling;
  return Math.floor(result);
}

function calculate_accel_calibration(slope, bias, value){
  let result = (value - bias) * 1000 / slope;
  return Math.floor(result);
}

function calculate_gyro_calibration(bias, value){
  let result = ((value - bias) * 125 * 10) / (8 * 32768); 
  return Math.floor(result);
}

function update_calibration(){
  let n = calibrations.size;
  if (n >= 2){
    let x_vals = calibrations.values().toArray();
    let y_vals = calibrations.keys().toArray();

    let x_mean = sum(x_vals) / n
    let y_mean = sum(y_vals) / n

    let x_diff = x_vals.map(x => x - x_mean)
    let y_diff = y_vals.map(y => y - y_mean)

    let num = zip(x_diff, y_diff).reduce((acc, [a, b]) => acc + a * b, 0)
    let den = x_diff.reduce((acc, a) => acc + a**2, 0)

    let slope = num / den
    let bias = y_mean - x_mean * slope

    let int_slope = Math.floor(slope * scaling)
    let int_bias = Math.floor(bias * scaling)
    
    calibration_slope = int_slope
    calibration_bias = int_bias
  
  }
  else{
    calibration_slope = null
    calibration_bias = null
  }
}

function unset_calibration(weight){
  calibrations.delete(weight);
}

function set_calibration(weight, force){
  calibrations.set(weight, force);
}

function set_captor_force(calibrated_force, raw_force){
  ui_set_captor_force(calibrated_force);
  ui_set_captor_force_raw(raw_force);

  if(calibration_slope !== null && calibration_bias !== null){
    let calibrated_force = calculate_force_calibration(calibration_slope, calibration_bias, raw_force);
    ui_set_calibrated_force(calibrated_force);
  }
  else{
    ui_unset_calibrated_force();
  }

  // Update global variables
  latest_calibrated_force = calibrated_force;
  latest_raw_force = raw_force;
}

function reset_calibration(){
  calibrations = new Map();
  calibration_slope = null;
  calibration_bias = null;
}


let accel_slope = [null, null, null];
let accel_bias = [null, null, null];
let accel_calibrations = new Map();

function unset_direction_calibration(direction){
  accel_calibrations.delete(direction);
}

function set_direction_calibration(direction, accel){
  accel_calibrations.set(direction, accel);
}


function update_accel_calibration(){
  accel_slope = [null, null, null];
  accel_bias = [null, null, null];

  for (direction of ['x','y','z']){
    if (accel_calibrations.has(direction) && accel_calibrations.has('-' + direction)){
      let max = accel_calibrations.get(direction);
      let min = accel_calibrations.get('-' + direction);
      let b = Math.floor((max + min) / 2);
      let a = Math.floor((max - min) / 2);
      accel_slope[direction2index(direction)] = a;
      accel_bias[direction2index(direction)] = b;
    }
  }
}


function set_accel_values(ax, ay, az, raw_ax, raw_ay, raw_az){
  ui_set_accel_values(ax, ay, az, raw_ax, raw_ay, raw_az);
  latest_raw_accel = [raw_ax, raw_ay, raw_az];
  latest_cal_accel = [ax, ay, az];
}

function set_gyro_values(gx, gy, gz, raw_gx, raw_gy, raw_gz){
  ui_set_gyro_values(gx, gy, gz, raw_gx, raw_gy, raw_gz);
  latest_raw_gyro = [raw_gx, raw_gy, raw_gz];
}


// ========================================
// ==== Listeners for device events =======
// ========================================

let VALUES_TO_MEAN = 20;
let FORCE_DELTA_THRESHOLD = 1000;
let ACCEL_DELTA_THRESHOLD = 1500;
let ACCEL_EXPECTED_G_RAW = 16384;
let ACCEL_PERMITED_RANGE_RAW = 2000;
let GYRO_DELTA_THRESHOLD = 10_000;

let last_values = [];

let LAST_VIEW = null;

async function handle_sensor_value_changed(event) {

  const view = event.target.value;

  LAST_VIEW = view;

  //debug
  if (trace_packets) { 
    let str = 'force packet:';
    for (let i=0; i<14; i++) {
      str = str + ' ' + view.getUint8(i);
    }
    log(str);
  }

  // Packet is formed with : 
  //enum SensorOffset {
  //    PACKET_OFFSET_TIMESTAMP = 0,
  //    PACKET_OFFSET_FORCE = 4,
  //    PACKET_OFFSET_ACCEL_X = 6,
  //    PACKET_OFFSET_ACCEL_Y = 8,
  //    PACKET_OFFSET_ACCEL_Z = 10,
  //    PACKET_OFFSET_GYRO_X = 12,
  //    PACKET_OFFSET_GYRO_Y = 14,
  //    PACKET_OFFSET_GYRO_Z = 16
  //};
  //
  

  let timestamp = view.getUint32(0, true);
  let calibrated_force = view.getInt16(4, true);
  let ax = view.getInt16(6, true);
  let ay = view.getInt16(8, true);
  let az = view.getInt16(10, true);

  let gx = view.getInt16(12, true);
  let gy = view.getInt16(14, true);
  let gz = view.getInt16(16, true);


// const size_t SENSOR_RAW_DATA_SIZE = 34;
// enum SensorRawOffset {
//     PACKET_OFFSET_FORCE_RAW = 18,   // 4 bytes
//     PACKET_OFFSET_ACCEL_X_RAW = 22, // 2 bytes
//     PACKET_OFFSET_ACCEL_Y_RAW = 24, // 2 bytes
//     PACKET_OFFSET_ACCEL_Z_RAW = 26, // 2 bytes
//     PACKET_OFFSET_GYRO_X_RAW = 28,  // 2 bytes
//     PACKET_OFFSET_GYRO_Y_RAW = 30,  // 2 bytes
//     PACKET_OFFSET_GYRO_Z_RAW = 32   // 2 bytes
// };
  let raw_force = view.getInt32(18, true);
  let raw_ax =    view.getInt16(22, true);
  let raw_ay =    view.getInt16(24, true);
  let raw_az =    view.getInt16(26, true);
  let raw_gx =    view.getInt16(28, true);
  let raw_gy =    view.getInt16(30, true);
  let raw_gz =    view.getInt16(32, true);

  if (trace_readings) {
    log(timestamp + ' ' + calibrated_force + ' ' + raw_force);
  }

  last_values.push([
    calibrated_force,
    raw_force,
    ax, ay, az,
    raw_ax, raw_ay, raw_az,
    gx, gy, gz,
    raw_gx, raw_gy, raw_gz,
    Date.now()
  ]);

  while (last_values.length > VALUES_TO_MEAN) last_values.shift();
  if (last_values.length == VALUES_TO_MEAN){
    
    current_timestamp = last_values[0][14];
    last_timestamp = last_values[VALUES_TO_MEAN - 1][14];
    let delta_hz = 0;
    for (let i = 0; i < VALUES_TO_MEAN - 1; i++){
      delta_hz += last_values[i + 1][14] - last_values[i][14];
    }
    let mean_delay = delta_hz / VALUES_TO_MEAN;
    ui_set_hz(1000 * (1 / mean_delay));

    // Smooth the values
    let smoothed_vector = last_values
      .reduce((acc, lst) => element_add(acc, lst), Array(last_values.length).fill(0))
      .map(x => x / VALUES_TO_MEAN);

    smoothed_calibrated_force = smoothed_vector[0];
    smoothed_raw_force = smoothed_vector[1];
    set_captor_force(smoothed_calibrated_force, smoothed_raw_force);

    sm_ax = Math.floor(smoothed_vector[2]);
    sm_ay = Math.floor(smoothed_vector[3]);
    sm_az = Math.floor(smoothed_vector[4]);
    sm_raw_ax = Math.floor(smoothed_vector[5]);
    sm_raw_ay = Math.floor(smoothed_vector[6]);
    sm_raw_az = Math.floor(smoothed_vector[7]);
    set_accel_values(
      sm_ax,
      sm_ay,
      sm_az,
      sm_raw_ax,
      sm_raw_ay,
      sm_raw_az
    );

    let get_max = (i) => last_values.reduce((acc, lst) => Math.max(acc, lst[i]), last_values[0][i]);
    let get_min = (i) => last_values.reduce((acc, lst) => Math.min(acc, lst[i]), last_values[0][i]);

    // Enable checkboxes if the force is stable
    let max_raw_force = get_max(1);
    let min_raw_force = get_min(1);
    let delta = max_raw_force - min_raw_force;
    ui_set_enable_checkboxes(delta < FORCE_DELTA_THRESHOLD, '.ui_force_checkbox');

    // Enable checkboxes if the acceleration is stable and in range
    let delta_ax = get_max(5) - get_min(5);
    let delta_ay = get_max(6) - get_min(6);
    let delta_az = get_max(7) - get_min(7);
    let delta_a = delta_ax + delta_ay + delta_az;

    let is_in_range = (x) => Math.abs(x - ACCEL_EXPECTED_G_RAW) < ACCEL_PERMITED_RANGE_RAW;
    let is_stable = delta_a < ACCEL_DELTA_THRESHOLD;

    ui_set_enable_checkboxes(is_stable && is_in_range(sm_raw_ax), '.ui_accel_checkbox_x')
    ui_set_bold_text_direction(is_stable && is_in_range(sm_raw_ax), '.ui_text_direction_x')

    ui_set_enable_checkboxes(is_stable && is_in_range(sm_raw_ay), '.ui_accel_checkbox_y')
    ui_set_bold_text_direction(is_stable && is_in_range(sm_raw_ay), '.ui_text_direction_y')

    ui_set_enable_checkboxes(is_stable && is_in_range(sm_raw_az), '.ui_accel_checkbox_z')
    ui_set_bold_text_direction(is_stable && is_in_range(sm_raw_az), '.ui_text_direction_z')

    ui_set_enable_checkboxes(is_stable && is_in_range(-sm_raw_ax), '.ui_accel_checkbox_-x')
    ui_set_bold_text_direction(is_stable && is_in_range(-sm_raw_ax), '.ui_text_direction_-x')

    ui_set_enable_checkboxes(is_stable && is_in_range(-sm_raw_ay), '.ui_accel_checkbox_-y')
    ui_set_bold_text_direction(is_stable && is_in_range(-sm_raw_ay), '.ui_text_direction_-y')

    ui_set_enable_checkboxes(is_stable && is_in_range(-sm_raw_az), '.ui_accel_checkbox_-z')
    ui_set_bold_text_direction(is_stable && is_in_range(-sm_raw_az), '.ui_text_direction_-z')

    // Enable gyro if the values are stable
    set_gyro_values(gx, gy, gz, raw_gx, raw_gy, raw_gz);
    let delta_gx = get_max(11) - get_min(11);
    let delta_gy = get_max(12) - get_min(12);
    let delta_gz = get_max(13) - get_min(13);
    let delta_g = delta_gx + delta_gy + delta_gz;

    ui_set_enable_checkboxes(delta_g < GYRO_DELTA_THRESHOLD, '.ui_gyro_checkbox');
  }
}


function handle_device_connection() {
  log('handle_device_connection');
  is_connected = true;
}

function handle_device_disconnection() {
  log('handle_device_disconnection');
  is_connected = false;
}


// ====================================
// == Connection to the Oups! device ==
// ====================================

let is_connected = false;
    
let trace_packets = false; // For debugging packets
let trace_readings = false; // For debuggin readings

function log(msg) {
  console.log(msg);
}

let device_name_prefix = 'Oups!';

// Hardware connection ids
let OUPS_service_id         = '0000ffe0-0000-1000-8000-00805f9b34fb';

// let force_characteristic_id = '0000ffe2-0000-1000-8000-00805f9b34fb';
// let IMU_characteristic_id   = '0000ffe3-0000-1000-8000-00805f9b34fb';
let sensor_characteristic_id = '0000ffea-0000-1000-8000-00805f9b34fb';
let include_raw_data_characteristic_id = '0000ffeb-0000-1000-8000-00805f9b34fb';

let force_offset_id = '0000ffe4-0000-1000-8000-00805f9b34fb';
let force_slope_id = '0000ffe5-0000-1000-8000-00805f9b34fb';

const gyro_bias_x_id = '0000ffed-0000-1000-8000-00805f9b34fb';
const gyro_bias_y_id = '0000ffee-0000-1000-8000-00805f9b34fb';
const gyro_bias_z_id = '0000ffef-0000-1000-8000-00805f9b34fb';
const accel_bias_x_id = '0000fff0-0000-1000-8000-00805f9b34fb';
const accel_bias_y_id = '0000fff1-0000-1000-8000-00805f9b34fb';
const accel_bias_z_id = '0000fff2-0000-1000-8000-00805f9b34fb';
const accel_slope_x_id = '0000fff3-0000-1000-8000-00805f9b34fb';
const accel_slope_y_id = '0000fff4-0000-1000-8000-00805f9b34fb';
const accel_slope_z_id = '0000fff5-0000-1000-8000-00805f9b34fb';

const accel_range_id = '0000ffe6-0000-1000-8000-00805f9b34fb';
const gyro_range_id = '0000ffe7-0000-1000-8000-00805f9b34fb';
const refresh_rate_id = '0000ffe8-0000-1000-8000-00805f9b34fb';

let bluetooth_device     = null;
let sensor_characteristic = null;
let include_raw_data_characteristic = null;

let force_slope_characteristic = null;
let force_offset_characteristic = null;

let accel_bias_x_characteristic = null;
let accel_bias_y_characteristic = null;
let accel_bias_z_characteristic = null;

let accel_scale_x_characteristic = null;
let accel_scale_y_characteristic = null;
let accel_scale_z_characteristic = null;

let gyro_bias_x_characteristic = null;
let gyro_bias_y_characteristic = null;
let gyro_bias_z_characteristic = null;

let refresh_rate_characteristic = null;
let accel_range_characteristic = null;
let gyro_range_characteristic = null;
let config_characteristics = new Map();

let latest_calibrated_force = null;
let latest_raw_force = null;

async function request_device() {

  log('*** Requesting device');

  bluetooth_device = await navigator.bluetooth.requestDevice({
    filters: [{namePrefix: device_name_prefix}],
    optionalServices: [OUPS_service_id]});

  bluetooth_device.addEventListener('gattserverdisconnected', on_disconnected);
}

async function on_disconnected() {

  log('*** Device disconnected');

  ui_state_set('disconnected');
  handle_device_disconnection();

  sensor_characteristic.removeEventListener('characteristicvaluechanged',
    handle_sensor_value_changed);
  sensor_characteristic = null;

  bluetooth_device = null;
}

async function disconnect_device() {

  log('*** Disconnecting device');

  if (bluetooth_device === null || !bluetooth_device.gatt.connected) return;

  await bluetooth_device.gatt.disconnect();
}

async function connect_device() {

  if (!bluetooth_device) {
    await request_device();
  }

  if (bluetooth_device.gatt.connected) return;

  //print
  log('*** Connecting to device');

  ui_state_set('connecting');

  const server = await bluetooth_device.gatt.connect();
  const service = await server.getPrimaryService(OUPS_service_id);

  sensor_characteristic = await service.getCharacteristic(sensor_characteristic_id);
  include_raw_data_characteristic = await service.getCharacteristic(include_raw_data_characteristic_id);

  // Enable raw data
  await include_raw_data_characteristic.writeValueWithResponse(new Uint8Array([1]));

  force_slope_characteristic = await service.getCharacteristic(force_slope_id);
  force_offset_characteristic = await service.getCharacteristic(force_offset_id);

  accel_bias_x_characteristic = await service.getCharacteristic(accel_bias_x_id);
  accel_bias_y_characteristic = await service.getCharacteristic(accel_bias_y_id);
  accel_bias_z_characteristic = await service.getCharacteristic(accel_bias_z_id);

  accel_scale_x_characteristic = await service.getCharacteristic(accel_slope_x_id);
  accel_scale_y_characteristic = await service.getCharacteristic(accel_slope_y_id);
  accel_scale_z_characteristic = await service.getCharacteristic(accel_slope_z_id);

  gyro_bias_x_characteristic = await service.getCharacteristic(gyro_bias_x_id);
  gyro_bias_y_characteristic = await service.getCharacteristic(gyro_bias_y_id);
  gyro_bias_z_characteristic = await service.getCharacteristic(gyro_bias_z_id);

  refresh_rate_characteristic = await service.getCharacteristic(refresh_rate_id);
  accel_range_characteristic = await service.getCharacteristic(accel_range_id);
  gyro_range_characteristic = await service.getCharacteristic(gyro_range_id);
  config_characteristics.set('accel_range', accel_range_characteristic);
  config_characteristics.set('gyro_range', gyro_range_characteristic);
  config_characteristics.set('refresh_rate', refresh_rate_characteristic);

  
  // get refresh rate
  let refresh_rate_view = await refresh_rate_characteristic.readValue();
  let refresh_rate = refresh_rate_view.getUint8(0);
  set_initial_value('refresh_rate', refresh_rate);

  let accel_range_view = await accel_range_characteristic.readValue();
  let accel_range = accel_range_view.getUint8(0);
  set_initial_value('accel_range', accel_range);

  let gyro_range_view = await gyro_range_characteristic.readValue();
  let gyro_range = gyro_range_view.getUint8(0);
  set_initial_value('gyro_range', gyro_range);

  sensor_characteristic.addEventListener('characteristicvaluechanged',
    handle_sensor_value_changed);

  ui_state_set('connected');
  handle_device_connection();

  await start_notifications();
}

async function start_notifications() {

  log('*** Starting notifications');

  try {
    await sensor_characteristic.startNotifications();
  } catch (exc) {
    log('Error: ' + exc);
  }
}
