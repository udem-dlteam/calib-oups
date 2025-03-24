// Copyright: Marc Feeley, 2024
// Copyright: Léonard Oest O'Leary, 2024
// v1: April 10, 2024
// v2: July 4, 2024

// ==================
// == UI functions ==
// ==================

function ui_setup(){

  if ('bluetooth' in navigator) {
    ui_setup_force_calibration_menu();
    ui_setup_accel_calibration_menu();
    ui_setup_other_configs_menu();
    ui_state_set('disconnected');
  } else {
    document.querySelector('body').innerHTML = 'Web Bluetooth is not available on this browser, please use a different browser such as Chrome or Edge.';
  }
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
      ['1000°/s (not recommended)', 1],
      ['2000°/s (not recommended)', 0]
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
  },
  {
    name: 'Serial Number:',
    key: 'serial_number',
    range: [0, 999],
    value: false,
    on_device_value: false,
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
    if (config.hasOwnProperty('possibilities')){
      let select = document.createElement('select');
      select.classList.add('ui_other_config_select');
      select.id = 'ui_other_config_' + config.key;
      select.onchange = function(){
        let value = parseInt(this.value);
        config.value = value;
      }

      row.appendChild(select);
    }
    else if (config.hasOwnProperty('range')){
      let [min, max] = config.range;
      let field = document.createElement('input');
      field.classList.add('ui_other_config_field');
      field.id = 'ui_other_config_' + config.key;
      field.type = 'number';
      field.min = min;
      field.max = max;

      field.onchange = function(){
        let value = parseInt(this.value);
        config.value = value;
      }

      if (config.value !== false){
        field.value = config.value;
      }

      row.appendChild(field);
    }

    container.appendChild(row);
  }

  ui_update_config_selects();
}

function ui_update_config_selects(){
  for (let config of OTHER_CONFIGS){

    if (config.hasOwnProperty('possibilities')){
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
    else if (config.hasOwnProperty('range')){
      field = document.querySelector('#ui_other_config_' + config.key);
      field.value = config.value;
    }
    else{
      console.err("Invalid config");
    }

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

      checkbox.onchange = function(){
        input_set_calibration_at_weight(weight, this.checked);
      }
      checkbox.disabled = true;
      row.appendChild(checkbox);

      // Weight label
      let weight_text = document.createElement('div');
      weight_text.innerHTML = weight + '<span class="ui_force_icon">g</span>';
      row.appendChild(weight_text);

      // Raw force
      let raw_text = document.createElement('div');
      raw_text.id = 'ui_weight_raw_' + weight;
      raw_text.innerText = NA_string;
      row.appendChild(raw_text);

      container.appendChild(row);
    }
  }
}

let accel_directions = ['x','y','z'];
let accel_sign = ['pos_', 'neg_'];
let direction_label = {
  'pos_x': '+X',
  'neg_x': '-X',
  'pos_y': '+Y',
  'neg_y': '-Y',
  'pos_z': '+Z',
  'neg_z': '-Z'
}

function ui_setup_accel_calibration_menu(){
  let container = document.querySelector('#ui_accel_calibration');
  if (container){
    let direction_index = 0;
    for (let raw_direction of accel_directions){
      let row = document.createElement('div');
      row.classList.add('ui_calibration_menu_row');

      let sign_index = 0;
      for (let sign of accel_sign){
        let direction = sign + raw_direction;
        // Checkbox
        let checkbox = document.createElement('input');
        checkbox.classList.add('ui_calibration_checkbox');
        checkbox.classList.add('ui_accel_checkbox');
        checkbox.classList.add('ui_accel_checkbox_' + direction)
        checkbox.type = 'checkbox';
        //checkbox.innerText = "set";
        let dir_ind = direction_index;
        let sign_ind = sign_index;
        checkbox.onchange = function(){
          input_set_calibration_at_direction(dir_ind, sign_ind, this.checked);
        }
        checkbox.disabled = true;
        row.appendChild(checkbox);

        // Direction label
        let direction_text = document.createElement('div');
        direction_text.classList.add('ui_text_direction_' +direction);
        direction_text.innerText = direction_label[direction];
        row.appendChild(direction_text);

        // Raw direction
        let raw_text = document.createElement('div');
        raw_text.id = 'ui_direction_raw_' + direction;
        raw_text.innerText = NA_string;
        row.appendChild(raw_text);
        sign_index++;
      }

      // Bias number
      let raw_text = document.createElement('div');
      raw_text.id = 'ui_direction_raw_bias_' + raw_direction;
      raw_text.innerText = NA_string;
      row.appendChild(raw_text);

      direction_index++;
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

  let factory_reset = document.querySelector('#ui_factory_reset');
  factory_reset.disabled = state !== 'connected';

  let authenticate_buttton = document.querySelector("#ui_authenticate_button");
  authenticate_buttton.disabled = state !== 'connected';


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

const ui_set_bold_weight_raw = (weigth, enabled) =>
  ui_set_bold_text_direction(enabled, '#ui_weight_raw_' + weigth);

const ui_set_direction_raw = (direction_index, sign_index, force) =>
  set_ui('#ui_direction_raw_' + accel_sign[sign_index] + accel_directions[direction_index])(force);

const ui_set_direction_raw_bias = (direction_index, force) =>
  set_ui('#ui_direction_raw_bias_' + accel_directions[direction_index])(force);

const ui_set_direction_calibrated = (direction, force) =>
  set_ui('#ui_direction_calibrated_' + direction)(force);

const ui_set_accel_x = set_ui('#ui_accel_x', 3);
const ui_set_accel_y = set_ui('#ui_accel_y', 3);
const ui_set_accel_z = set_ui('#ui_accel_z', 3);

const ui_set_accel_x_raw = set_ui('#ui_accel_x_raw', 0);
const ui_set_accel_y_raw = set_ui('#ui_accel_y_raw', 0);
const ui_set_accel_z_raw = set_ui('#ui_accel_z_raw', 0);

const ui_set_gyro_x =  set_ui('#ui_gyro_x',  2);
const ui_set_gyro_y =  set_ui('#ui_gyro_y',  2);
const ui_set_gyro_z =  set_ui('#ui_gyro_z',  2);

const ui_set_gyro_x_raw =  set_ui('#ui_gyro_x_raw',  0);
const ui_set_gyro_y_raw =  set_ui('#ui_gyro_y_raw',  0);
const ui_set_gyro_z_raw =  set_ui('#ui_gyro_z_raw',  0);

const ui_set_gyro_bias_x =  set_ui('#ui_gyro_bias_x',  0);
const ui_set_gyro_bias_y =  set_ui('#ui_gyro_bias_y',  0);
const ui_set_gyro_bias_z =  set_ui('#ui_gyro_bias_z',  0);

const ui_set_hz = set_ui('#ui_connection_hz', 0);

const ui_set_battery = set_ui('#ui_battery', 0);
const ui_set_battery_raw = set_ui('#ui_battery_raw', 0);
const ui_set_temp = set_ui('#ui_temp', 2);
const ui_set_temp_raw = set_ui('#ui_temp_raw', 4);
const ui_set_temp_raw_raw = set_ui('#ui_temp_raw_raw', 0);

// Inserts a dot at pos
const integer_to_string = (raw_accel, pos) => {
  let abs_accel = Math.abs(raw_accel);
  let paddedResult = (abs_accel+"").padStart(pos+1, '0');
  dot_position = paddedResult.length - pos;
  return (raw_accel < 0 ? "-" : "") + paddedResult.slice(0, dot_position) + '.' + paddedResult.slice(dot_position);
}

const ui_set_accel_values = (ax, ay, az, raw_ax, raw_ay, raw_az) => {
  ui_set_accel_x(ax / accel_precision);
  ui_set_accel_y(ay / accel_precision);
  ui_set_accel_z(az / accel_precision);
  ui_set_accel_x_raw(raw_ax);
  ui_set_accel_y_raw(raw_ay);
  ui_set_accel_z_raw(raw_az);
}

let gyro_precision = 64;
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

  ui_set_gyro_x(gx / gyro_precision)
  ui_set_gyro_y(gy / gyro_precision)
  ui_set_gyro_z(gz / gyro_precision)

  ui_set_gyro_x_raw(raw_gx)
  ui_set_gyro_y_raw(raw_gy)
  ui_set_gyro_z_raw(raw_gz)
}

const NA_string = '';

const ui_enable_calibrated_accel = (enable, selector) => {
  let x = document.querySelector(selector);
  if (enable){
    x.classList.add('ui_calibrated');
  }
  else{
    x.classList.remove('ui_calibrated');
  }
}

const set_enable_direction = (enabled, direction_index, sign_index) => {
  let checkbox = document.querySelector('.ui_accel_checkbox_' + accel_sign[sign_index] + accel_directions[direction_index]);
  let is_checked = checkbox.checked;
  if (!is_checked && enabled){
    input_set_calibration_at_direction(direction_index, sign_index, true);
    checkbox.checked = true;
  }

  ui_set_enable_checkboxes(enabled, '.ui_accel_checkbox_' + accel_sign[sign_index] + accel_directions[direction_index]);
  ui_set_bold_text_direction(enabled, '.ui_text_direction_' + accel_sign[sign_index] + accel_directions[direction_index])
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
  force_calibrations.keys().forEach(weight => input_set_calibration_at_weight(weight, false));
  for(let i = 0; i < 3; i++){
    for(let j = 0; j < 2; j++){
      input_set_calibration_at_direction(i, j, false);
    }
  }
  input_gyro_checkbox_click(false);
  ui_reset_checkboxes();
  reset_calibration();
  ui_update_force_calibration();
  ui_update_config_selects();

}

function ui_update_force_calibration(){
  if (force_calibrations.size >= 2){
    let raw_calibrations = calculate_raw_calibrations(force_calibrations);
    standard_weights.forEach((weight, index) => { ui_set_weight_raw(weight, raw_calibrations[index]); });
  } else {

    standard_weights.forEach((weight) => {
      if (force_calibrations.has(weight)){
        ui_set_weight_raw(weight, force_calibrations.get(weight));
      } else{
        ui_set_weight_raw(weight, NA_string);
      }
    });
  }
}

// =======================
// == UI event handlers ==
// =======================


async function input_calibrate_button_click(){
  if (force_calibrations.size < 2
      && accel_slope_pos.every(x => x === null)
      && accel_slope_neg.every(x => x === null)
      && accel_bias.every(x => x === null)
      && gyro_bias.every(x => x === null)
      && OTHER_CONFIGS.every(config => config.on_device_value === config.value)
      && authentification_pwd === ""){
    alert('Please calibrate the device first');
    return;
  }

  //[slope_x, slope_y, slope_z] = accel_slope;
  //[bias_x, bias_y, bias_z] = accel_bias;
  let accel_characteristic_pos = [
    [accel_scale_pos_x_characteristic, "pos_x"],
    [accel_scale_pos_y_characteristic, "pos_y"],
    [accel_scale_pos_z_characteristic, "pos_z"]
  ];

  let accel_characteristic_neg = [
    [accel_scale_neg_x_characteristic, "neg_x"],
    [accel_scale_neg_y_characteristic, "neg_y"],
    [accel_scale_neg_z_characteristic, "neg_z"]
  ];

  let accel_bias_characteristics = [
    [accel_bias_x_characteristic, "bias_x"],
    [accel_bias_y_characteristic, "bias_x"],
    [accel_bias_z_characteristic, "bias_x"]
  ]

  let written = "";
  try{

    if (force_calibrations.size >= 2){
      let raw_calibrations = calculate_raw_calibrations(force_calibrations);
      let raw_calibrations_rounded = raw_calibrations.map(x => Math.round(x));
      await calibration_forces_characteristic.writeValueWithResponse(new Uint32Array(raw_calibrations));
      written += "force ";
    }

    // Write positive, negative ans bias slopes
    let pos_neg_slopes = [].concat(
      zip(accel_slope_pos, accel_characteristic_pos),
      zip(accel_slope_neg, accel_characteristic_neg),
      zip(accel_bias, accel_bias_characteristics)
    );

    for([accel_value, [characteristic, name]] of pos_neg_slopes){
      if(accel_value !== null){
        await characteristic.writeValueWithResponse(new Int32Array([accel_value]));
        written += "accel_" + name + " ";
      }
    }

    if(gyro_bias.every(x => x !== null)){
      await gyro_bias_x_characteristic.writeValueWithResponse(new Int32Array([gyro_bias[0]]));
      await gyro_bias_y_characteristic.writeValueWithResponse(new Int32Array([gyro_bias[1]]));
      await gyro_bias_z_characteristic.writeValueWithResponse(new Int32Array([gyro_bias[2]]));
      written += "gyro ";
    }

    let current_serial_number;
    OTHER_CONFIGS.forEach((config) => {
      on_device = config.on_device_value;
      current = config.value;
      key = config.key;

      if (key === 'serial_number'){
        current_serial_number = current;
      }

      if (on_device !== current){
        let characteristic = config_characteristics.get(key);
        characteristic.writeValueWithResponse(new Uint32Array([current]));
        written += key + " ";
        config.on_device_value = current;
      }

    });

    if (authentification_pwd !== ""){
      const hash = await authentification_hash(device_mac_address, current_serial_number, authentification_pwd);
      await security_number_characteristic.writeValueWithResponse(new Uint8Array(hash));
      written += "security_number ";
    }

  } catch (e){
    console.error(e);
    alert("Error while writing the calibration values");
    return;
  }

  alert("The following calibration values were written to the device :" + written);
  ui_reset_calibration();
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
    ui_set_bold_weight_raw(weight, true);
    set_calibration(weight, latest_raw_force);
  }
  else{
    ui_set_weight_raw(weight, NA_string);
    ui_set_bold_weight_raw(weight, false);
    unset_calibration(weight);
  }

  ui_update_force_calibration();
}

async function input_set_calibration_at_direction(direction_index, sign_index, checked){
  if (checked){
    ui_set_direction_raw(direction_index, sign_index, latest_raw_accel[direction_index]);
    set_direction_calibration(direction_index, sign_index, latest_raw_accel[direction_index]);
    set_direction_bias_calibration(direction_index, sign_index, latest_raw_accel);
  }
  else{
    ui_set_direction_raw(direction_index, sign_index, NA_string);
    unset_direction_calibration(direction_index, sign_index);
    unset_direction_bias_calibration(direction_index, sign_index);
  }
  update_accel_calibration();
  ui_update_accel_calibration();
}

let gyro_bias = [null, null, null];
async function input_gyro_checkbox_click(checked){

  if(checked){
    gyro_bias = latest_raw_gyro;
    ui_set_gyro_bias_x(gyro_bias[0]);
    ui_set_gyro_bias_y(gyro_bias[1]);
    ui_set_gyro_bias_z(gyro_bias[2]);
  } else{
    gyro_bias = [null, null, null];

    ui_set_gyro_bias_x(NA_string);
    ui_set_gyro_bias_y(NA_string);
    ui_set_gyro_bias_z(NA_string);
  }
}

//  set(Config::SAMPLE_RATE, 50);
//  set(Config::FORCE_OFFSET, 0);
//  set(Config::FORCE_SLOPE, -4500);
//  set(Config::SERIAL_NUMBER, 1);
//  set(Config::ACCEL_BIAS_X, 0);
//  set(Config::ACCEL_BIAS_Y, 0);
//  set(Config::ACCEL_BIAS_Z, 0);
//  set(Config::ACCEL_SLOPE_POS_X, 32768);
//  set(Config::ACCEL_SLOPE_POS_Y, 32768);
//  set(Config::ACCEL_SLOPE_POS_Z, 32768);
//  set(Config::ACCEL_SLOPE_NEG_X, 32768);
//  set(Config::ACCEL_SLOPE_NEG_Y, 32768);
//  set(Config::ACCEL_SLOPE_NEG_Z, 32768);
//  set(Config::GYRO_BIAS_X, 0);
//  set(Config::GYRO_BIAS_Y, 0);
//  set(Config::GYRO_BIAS_Z, 0);

let default_values = {
  'refresh_rate': 50,
  'accel_range' : 2,
  'gyro_range' : 4,
  'force_offset': 0,
  'force_slope': -4500,
  'accel_bias_x': 0,
  'accel_bias_y': 0,
  'accel_bias_z': 0,
  'accel_slope_pos_x': 32768,
  'accel_slope_pos_y': 32768,
  'accel_slope_pos_z': 32768,
  'accel_slope_neg_x': 32768,
  'accel_slope_neg_y': 32768,
  'accel_slope_neg_z': 32768,
  'gyro_bias_x': 0,
  'gyro_bias_y': 0,
  'gyro_bias_z': 0
}


async function input_factory_reset_click(){
  if (confirm('Are you sure you want to factory reset the device?')){
    // TODO: remove this
    console.log("resetting...");
    ui_state_set('connecting');

    await accel_bias_x_characteristic.writeValueWithResponse(new Int32Array([default_values['accel_bias_x']]));
    console.log("accel bias x done");

    await accel_bias_y_characteristic.writeValueWithResponse(new Int32Array([default_values['accel_bias_y']]));
    console.log("accel bias y done");

    await accel_bias_z_characteristic.writeValueWithResponse(new Int32Array([default_values['accel_bias_z']]));
    console.log("accel bias z done");

    await accel_scale_pos_x_characteristic.writeValueWithResponse(new Int32Array([default_values['accel_slope_pos_x']]));
    console.log("accel slope x done");

    await accel_scale_pos_y_characteristic.writeValueWithResponse(new Int32Array([default_values['accel_slope_pos_y']]));
    console.log("accel slope y done");

    await accel_scale_pos_z_characteristic.writeValueWithResponse(new Int32Array([default_values['accel_slope_pos_z']]));
    console.log("accel slope z done");

    await accel_scale_neg_x_characteristic.writeValueWithResponse(new Int32Array([default_values['accel_slope_neg_x']]));
    console.log("accel slope x done");

    await accel_scale_neg_y_characteristic.writeValueWithResponse(new Int32Array([default_values['accel_slope_neg_y']]));
    console.log("accel slope y done");

    await accel_scale_neg_z_characteristic.writeValueWithResponse(new Int32Array([default_values['accel_slope_neg_z']]));
    console.log("accel slope z done");

    await gyro_bias_x_characteristic.writeValueWithResponse(new Int32Array([default_values['gyro_bias_x']]));
    console.log("gyro bias x done");

    await gyro_bias_y_characteristic.writeValueWithResponse(new Int32Array([default_values['gyro_bias_y']]));
    console.log("gyro bias y done");

    await gyro_bias_z_characteristic.writeValueWithResponse(new Int32Array([default_values['gyro_bias_z']]));
    console.log("gyro bias z done");

    await refresh_rate_characteristic.writeValueWithResponse(new Int32Array([default_values['refresh_rate']]));
    console.log("refresh rate done");

    await accel_range_characteristic.writeValueWithResponse(new Int32Array([default_values['accel_range']]));
    console.log("accel range done");

    await gyro_range_characteristic.writeValueWithResponse(new Int32Array([default_values['gyro_range']]));
    console.log("gyro range done");

    ui_reset_calibration();
    alert('Factory reset done');
    ui_state_set('connected');
  }
}

// ================================
// == Force calibration routines ==
// ================================

const sum = (lst) => lst.reduce((a, b) => a + b, 0);
const zip = (a, b) => a.map((k, i) => [k, b[i]]);
const element_add = (a, b) => a.map((k, i) => k + b[i]);

let force_calibrations = new Map();

function calculate_raw_calibrations(calibrations){
  if (calibrations.size < 2){
    return [];
  }

  let raw_calibrations = [null, null, null, null, null, null, null, null];

  // Fill with standard weights
  for (let i = 0; i < standard_weights.length; i++){
    standard_weight = standard_weights[i];
    if (calibrations.has(standard_weight)){
      raw_calibrations[i] = calibrations.get(standard_weight);
    }
  }

  // Fill missing by interpolating
  for (let i = 0; i < standard_weights.length; i++){
    if (raw_calibrations[i] === null){
      let weight = standard_weights[i];
      // Left0 and right0 are the closest non null values to the right and left of i
      let left0 = i;
      let right0 = i;
      while (left0 >= 0 && raw_calibrations[left0] === null) left0--;
      while (right0 < raw_calibrations.length && raw_calibrations[right0] === null) right0++;

      // If left is not found, then right is left and we try to find the first non null value to the right of left
      if (left0 == -1){
        left0 = right0;
        right0++;
        while (right0 < raw_calibrations.length && raw_calibrations[right0] === null) right0--;
      }

      // Similar for right
      if (right0 == raw_calibrations.length){
        right0 = left0;
        left0--;
        while (left0 >= 0 && raw_calibrations[left0] === null) left0--;
      }

      // Should never happen as we have 2 non null values
      if (left0 == -1 || right0 == raw_calibrations.length){
        throw new Error('Invalid calibration');
      }

      // Iterpolate with left0 and right0
      let left_weight = standard_weights[left0];
      let left_value = raw_calibrations[left0];
      let right_weight = standard_weights[right0];
      let right_value = raw_calibrations[right0];

      let slope = (right_value - left_value) / (right_weight - left_weight);
      let bias = left_value - slope * left_weight;

      raw_calibrations[i] = slope * weight + bias;
    }
  }

  return raw_calibrations;
}

function calculate_accel_calibration(slope, bias, value){
  let result = (value - bias) * 1000 / slope;
  return Math.floor(result);
}

function calculate_gyro_calibration(bias, value){
  let result = ((value - bias) * 1000) / 32768;
  return Math.floor(result);
}

function unset_calibration(weight){
  force_calibrations.delete(weight);
}

function set_calibration(weight, force){
  force_calibrations.set(weight, force);
}

function calculate_force_calibration(raw_force_calibrations, raw_force){
  // Taken from firmware, translated in js
  let force_raw_value = raw_force;
  let raw_calibration_points = raw_force_calibrations;
  let force_value; // calculated in the loop below

  // Calibrations points are assumed to all be in either increasing or decreasing order
  let direction_is_increasing = raw_calibration_points[0] < raw_calibration_points[1];

  for (let i = 1; i < 8; i++)
  {
      let curr_raw = raw_calibration_points[i];

      if ((direction_is_increasing && force_raw_value < curr_raw)
          || (!direction_is_increasing && force_raw_value > curr_raw)
          || i==7)
      {
          // Linear extrapolation with (curr_raw, curr_gt) and (prev_raw, prev_gt)
          let prev_raw = raw_calibration_points[i-1];
          let curr_gt = standard_weights[i];
          let prev_gt = standard_weights[i-1];

          force_value = (prev_raw - force_raw_value) * (curr_gt - prev_gt) / (prev_raw - curr_raw) + prev_gt;
          break;
      }
  }

  return force_value;
}

function set_captor_force(calibrated_force, raw_force){
  ui_set_captor_force(calibrated_force);
  ui_set_captor_force_raw(raw_force);

  if(force_calibrations.size >= 2){
    let raw_force_calibrations = calculate_raw_calibrations(force_calibrations);
    let calibrated_force = calculate_force_calibration(raw_force_calibrations, raw_force);
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
  force_calibrations = new Map();

  accel_slope_pos = [null, null, null];
  accel_slope_neg = [null, null, null];
  accel_bias = [null, null, null];
  accel_calibrations = [null, null, null, null, null, null];
  accel_calibrations_bias = Array.from({length: 3}, () => Array.from({length: 6}, () => null));

  gyro_bias = [null, null, null];
}


let accel_slope_pos = [null, null, null];
let accel_slope_neg = [null, null, null];
let accel_bias = [null, null, null];
let accel_calibrations_direction = [null, null, null, null, null, null];
let accel_calibrations_bias = Array.from({length: 3}, () => Array.from({length: 6}, () => null));

function unset_direction_calibration(direction_index, sign_index){
  accel_calibrations_direction[direction_index + 3 * sign_index] = null;
}

function set_direction_calibration(direction_index, sign_index, accel){
  accel_calibrations_direction[direction_index + 3 * sign_index] = accel;
}

function set_direction_bias_calibration(direction_index, sign_index, latest_raw_accel){
  let other1 = (direction_index + 1) % 3;
  let other2 = (direction_index + 2) % 3;

  accel_calibrations_bias[other1][direction_index + 3 * sign_index] = latest_raw_accel[other1];
  accel_calibrations_bias[other2][direction_index + 3 * sign_index] = latest_raw_accel[other2];
}

function unset_direction_bias_calibration(direction_index, sign_index){
  let other1 = (direction_index + 1) % 3;
  let other2 = (direction_index + 2) % 3;

  accel_calibrations_bias[other1][direction_index + 3 * sign_index] = null;
  accel_calibrations_bias[other2][direction_index + 3 * sign_index] = null;
}


function mean_not_null(lst){
  let elem = 0;
  let sum = 0;
  for (let i = 0; i < lst.length; i++){
    if (lst[i] !== null){
      sum += lst[i];
      elem++;
    }
  }
  return sum / elem;
}

let accel_scaling = 65536;
let accel_precision = 8192;
function update_accel_calibration(){
  accel_slope_pos = [null, null, null];
  accel_slope_neg = [null, null, null];
  accel_bias = [null, null, null];

  for (let i = 0; i < 3; i++){
    let non_null_count = accel_calibrations_bias[i].reduce((acc, value) => (value !== null ? 1 : 0) + acc, 0);
    if (non_null_count === 4){
      accel_bias[i] = mean_not_null(accel_calibrations_bias[i]);
    }
    // count number of non null values. If there are 4, this means
    // that we have found the bias for all directions
  }


  for (let i = 0; i < 3; i++){
    if (accel_bias[i] !== null){
      if (accel_calibrations_direction[i] !== null) {
        let value_pos = accel_calibrations_direction[i] - accel_bias[i];

        accel_slope_pos[i] =
          Math.floor((accel_precision * accel_scaling) / value_pos);

        let value_neg = accel_calibrations_direction[i + 3] - accel_bias[i];

        accel_slope_neg[i] =
          -Math.floor((accel_precision * accel_scaling) / value_neg);
      }
    }
  }

}

function ui_update_accel_calibration(){
  for (let i = 0; i < 3; i++){
    if (accel_bias[i] !== null){
      ui_set_direction_raw_bias(i, accel_bias[i]);
    }
    else{
      ui_set_direction_raw_bias(i, NA_string);
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

// ======================================
// ==== Security authentification =======
// ======================================

let authentification_pwd = "";
function input_authentification_on_input(value){
  authentification_pwd = value
}

async function input_authentification_validate(){

  const serial_number = (await serial_number_characteristic.readValue()).getUint32(0, true);
  const hash = await authentification_hash(device_mac_address, serial_number, authentification_pwd);
  const hash_str = Array.from(new Uint8Array(hash)).reduce((acc, value) => acc + value.toString(16).padStart(2, '0'), '');

  const current_hash = await security_number_characteristic.readValue();
  const current_hash_str = Array.from(new Uint8Array(current_hash.buffer)).reduce((acc, value) => acc + value.toString(16).padStart(2, '0'), '');

  if (hash_str === current_hash_str){
    alert("Authentification successful");
  }
  else{
    alert("Authentification failed");
  }
}

async function authentification_hash(mac_address, serial_number, pwd){

  const encoder = new TextEncoder();
  const string_to_encode = mac_address + "||" + "OUPS" + (serial_number+"").padStart(3, '0') + "||" +pwd;
  const data = encoder.encode(string_to_encode);

  return await window.crypto.subtle.digest("SHA-256", data);

}

// ========================================
// ==== Listeners for device events =======
// ========================================

let VALUES_TO_MEAN = 20;
let FORCE_DELTA_THRESHOLD = 1000;
let ACCEL_DELTA_THRESHOLD = 1500;
let ACCEL_EXPECTED_G_RAW = 16384;
let ACCEL_PERMITED_RANGE_RAW = 2000;
let ACCEL_ZERO_PERMITED_RANGE_RAW = 150;
let GYRO_DELTA_THRESHOLD = 10_000;

let last_values = [];
let last_timestamp = false;

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


  // const size_t SENSOR_DATA_SIZE = 20;
  // enum SensorOffset {
  //     PACKET_OFFSET_TIMESTAMP = 0, // 4 bytes
  //     PACKET_OFFSET_FORCE     = 4, // 2 bytes
  //     PACKET_OFFSET_ACCEL_X   = 6, // 2 bytes
  //     PACKET_OFFSET_ACCEL_Y   = 8, // 2 bytes
  //     PACKET_OFFSET_ACCEL_Z   = 10, // 2 bytes
  //     PACKET_OFFSET_GYRO_X    = 12, // 2 bytes
  //     PACKET_OFFSET_GYRO_Y    = 14, // 2 bytes
  //     PACKET_OFFSET_GYRO_Z    = 16, // 2 bytes
  //     PACKET_OFFSET_BATTERY   = 18, // 1 byte
  //     PACKET_OFFSET_TEMP      = 19, // 1 byte
  // };
  let timestamp = view.getUint32(0, true);
  let calibrated_force = view.getInt16(4, true);
  let ax = view.getInt16(6, true);
  let ay = view.getInt16(8, true);
  let az = view.getInt16(10, true);

  let gx = view.getInt16(12, true);
  let gy = view.getInt16(14, true);
  let gz = view.getInt16(16, true);
  let battery = view.getUint8(18, true);
  let temp = view.getUint8(19, true);


  // const size_t SENSOR_RAW_DATA_SIZE = SENSOR_DATA_SIZE + 32;
  // enum SensorRawOffset {
  //     PACKET_OFFSET_FORCE_RAW =   SENSOR_DATA_SIZE,     // 4 bytes
  //     PACKET_OFFSET_ACCEL_X_RAW = SENSOR_DATA_SIZE + 4, // 4 bytes
  //     PACKET_OFFSET_ACCEL_Y_RAW = SENSOR_DATA_SIZE + 8, // 4 bytes
  //     PACKET_OFFSET_ACCEL_Z_RAW = SENSOR_DATA_SIZE + 12, // 4 bytes
  //     PACKET_OFFSET_GYRO_X_RAW =  SENSOR_DATA_SIZE + 16, // 4 bytes
  //     PACKET_OFFSET_GYRO_Y_RAW =  SENSOR_DATA_SIZE + 20, // 4 bytes
  //     PACKET_OFFSET_GYRO_Z_RAW =  SENSOR_DATA_SIZE + 24, // 4 bytes
  //     PACKET_OFFSET_BATTERY_RAW = SENSOR_DATA_SIZE + 28, // 2 bytes
  //     PACKET_OFFSET_TEMP_RAW    = SENSOR_DATA_SIZE + 30  // 2 bytes
  // };
  let raw_offset = 20;
  let raw_force =   view.getInt32(raw_offset, true);
  let raw_ax =      view.getInt32(raw_offset + 4, true);
  let raw_ay =      view.getInt32(raw_offset + 8, true);
  let raw_az =      view.getInt32(raw_offset + 12, true);
  let raw_gx =      view.getInt32(raw_offset + 16, true);
  let raw_gy =      view.getInt32(raw_offset + 20, true);
  let raw_gz =      view.getInt32(raw_offset + 24, true);
  let raw_battery = view.getUint16(raw_offset + 28, true);
  let raw_temp =    view.getInt16(raw_offset + 30, true);

  if (trace_readings) {
    log(timestamp + ' ' + calibrated_force + ' ' + raw_force);
  }

  if (last_timestamp === false){
    last_timestamp = timestamp;
  }

  last_values.push([
    calibrated_force,
    raw_force,
    ax, ay, az,
    raw_ax, raw_ay, raw_az,
    gx, gy, gz,
    raw_gx, raw_gy, raw_gz,
    timestamp-last_timestamp,
    battery,
    raw_battery,
    temp,
    raw_temp
  ]);

  last_timestamp = timestamp;

  while (last_values.length > VALUES_TO_MEAN) last_values.shift();
  if (last_values.length == VALUES_TO_MEAN){
    // Smooth the values
    let smoothed_vector = last_values
      .reduce((acc, lst) => element_add(acc, lst), Array(last_values[0].length).fill(0))
      .map(x => x / VALUES_TO_MEAN);


    ui_set_hz(1000 * (1 / smoothed_vector[14]));

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
    let is_near_zero = (x) => Math.abs(x) < ACCEL_ZERO_PERMITED_RANGE_RAW;
    let is_stable = delta_a < ACCEL_DELTA_THRESHOLD;

    let lst = [sm_raw_ax, sm_raw_ay, sm_raw_az, -sm_raw_ax, -sm_raw_ay, -sm_raw_az];

    for (let i = 0; i < 6; i++){
      let direction_index = i % 3;
      let sign_index = Math.floor(i / 3);
      set_enable_direction(
        is_stable
        && is_in_range(lst[i])
        && is_near_zero(lst[(i + 1) % 3])
        && is_near_zero(lst[(i + 2) % 3]),
        direction_index,
        sign_index
      );
    }

    // Enable gyro if the values are stable
    set_gyro_values(gx, gy, gz, raw_gx, raw_gy, raw_gz);
    let delta_gx = get_max(11) - get_min(11);
    let delta_gy = get_max(12) - get_min(12);
    let delta_gz = get_max(13) - get_min(13);
    let delta_g = delta_gx + delta_gy + delta_gz;

    ui_set_enable_checkboxes(delta_g < GYRO_DELTA_THRESHOLD, '.ui_gyro_checkbox');

    // Update the battery
    sm_battery = Math.floor(smoothed_vector[15]);
    sm_raw_battery = Math.floor(smoothed_vector[16]);
    ui_set_battery(sm_battery);
    ui_set_battery_raw(sm_raw_battery);


    // Update the temperature
    sm_temp = smoothed_vector[17];
    sm_raw_temp = smoothed_vector[18];
    ui_set_temp(sm_temp / 4);
    ui_set_temp_raw(sm_raw_temp / 132.48 + 25);
    ui_set_temp_raw_raw(sm_raw_temp);
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

let device_name_prefix = 'OUPS';
let device_mac_address = null;

// Hardware connection ids

let info_service_id =    '0000180a-0000-1000-8000-00805f9b34fb';
const serial_number_id = '0000fffa-0000-1000-8000-00805f9b34fb';
const mac_address_id = '0000fffb-0000-1000-8000-00805f9b34fb';

let OUPS_service_id         = '0000ffe0-0000-1000-8000-00805f9b34fb';

// let force_characteristic_id = '0000ffe2-0000-1000-8000-00805f9b34fb';
// let IMU_characteristic_id   = '0000ffe3-0000-1000-8000-00805f9b34fb';
let sensor_characteristic_id = '0000ffea-0000-1000-8000-00805f9b34fb';
let include_raw_data_characteristic_id = '0000ffeb-0000-1000-8000-00805f9b34fb';



//let force_offset_id = '0000ffe4-0000-1000-8000-00805f9b34fb';
//let force_slope_id = '0000ffe5-0000-1000-8000-00805f9b34fb';

const gyro_bias_x_id = '0000ffed-0000-1000-8000-00805f9b34fb';
const gyro_bias_y_id = '0000ffee-0000-1000-8000-00805f9b34fb';
const gyro_bias_z_id = '0000ffef-0000-1000-8000-00805f9b34fb';
const accel_bias_x_id = '0000fff0-0000-1000-8000-00805f9b34fb';
const accel_bias_y_id = '0000fff1-0000-1000-8000-00805f9b34fb';
const accel_bias_z_id = '0000fff2-0000-1000-8000-00805f9b34fb';
const accel_slope_pos_x_id = '0000fff3-0000-1000-8000-00805f9b34fb';
const accel_slope_pos_y_id = '0000fff4-0000-1000-8000-00805f9b34fb';
const accel_slope_pos_z_id = '0000fff5-0000-1000-8000-00805f9b34fb';
const accel_slope_neg_x_id = '0000fff6-0000-1000-8000-00805f9b34fb';
const accel_slope_neg_y_id = '0000fff7-0000-1000-8000-00805f9b34fb';
const accel_slope_neg_z_id = '0000fff8-0000-1000-8000-00805f9b34fb';
const security_number_id = '0000fffa-0000-1000-8000-00805f9b34fb';
const calibration_forces_id = '0000fffb-0000-1000-8000-00805f9b34fb';

const accel_range_id = '0000ffe6-0000-1000-8000-00805f9b34fb';
const gyro_range_id = '0000ffe7-0000-1000-8000-00805f9b34fb';
const refresh_rate_id = '0000ffe8-0000-1000-8000-00805f9b34fb';

let bluetooth_device     = null;
let sensor_characteristic = null;
let include_raw_data_characteristic = null;

let accel_bias_x_characteristic = null;
let accel_bias_y_characteristic = null;
let accel_bias_z_characteristic = null;

let accel_scale_pos_x_characteristic = null;
let accel_scale_pos_y_characteristic = null;
let accel_scale_pos_z_characteristic = null;

let accel_scale_neg_x_characteristic = null;
let accel_scale_neg_y_characteristic = null;
let accel_scale_neg_z_characteristic = null;

let gyro_bias_x_characteristic = null;
let gyro_bias_y_characteristic = null;
let gyro_bias_z_characteristic = null;

let security_number_characteristic = null;
let calibration_forces_characteristic = null;

let refresh_rate_characteristic = null;
let accel_range_characteristic = null;
let gyro_range_characteristic = null;
let serial_number_characteristic = null;
let config_characteristics = new Map();

let latest_calibrated_force = null;
let latest_raw_force = null;

async function request_device() {

  log('*** Requesting device');

  bluetooth_device = await navigator.bluetooth.requestDevice({
    filters: [{namePrefix: device_name_prefix}],
    optionalServices: [OUPS_service_id, info_service_id]});

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
  const info_service = await server.getPrimaryService(info_service_id);

  const service = await server.getPrimaryService(OUPS_service_id);

  sensor_characteristic = await service.getCharacteristic(sensor_characteristic_id);
  include_raw_data_characteristic = await service.getCharacteristic(include_raw_data_characteristic_id);

  // Enable raw data
  await include_raw_data_characteristic.writeValueWithResponse(new Uint8Array([1]));

  calibration_forces_characteristic = await service.getCharacteristic(calibration_forces_id);

  accel_bias_x_characteristic = await service.getCharacteristic(accel_bias_x_id);
  accel_bias_y_characteristic = await service.getCharacteristic(accel_bias_y_id);
  accel_bias_z_characteristic = await service.getCharacteristic(accel_bias_z_id);

  accel_scale_pos_x_characteristic = await service.getCharacteristic(accel_slope_pos_x_id);
  accel_scale_pos_y_characteristic = await service.getCharacteristic(accel_slope_pos_y_id);
  accel_scale_pos_z_characteristic = await service.getCharacteristic(accel_slope_pos_z_id);

  accel_scale_neg_x_characteristic = await service.getCharacteristic(accel_slope_neg_x_id);
  accel_scale_neg_y_characteristic = await service.getCharacteristic(accel_slope_neg_y_id);
  accel_scale_neg_z_characteristic = await service.getCharacteristic(accel_slope_neg_z_id);

  gyro_bias_x_characteristic = await service.getCharacteristic(gyro_bias_x_id);
  gyro_bias_y_characteristic = await service.getCharacteristic(gyro_bias_y_id);
  gyro_bias_z_characteristic = await service.getCharacteristic(gyro_bias_z_id);

  refresh_rate_characteristic = await service.getCharacteristic(refresh_rate_id);
  accel_range_characteristic = await service.getCharacteristic(accel_range_id);
  gyro_range_characteristic = await service.getCharacteristic(gyro_range_id);
  serial_number_characteristic = await info_service.getCharacteristic(serial_number_id);
  mac_address_characteristic = await info_service.getCharacteristic(mac_address_id);

  security_number_characteristic = await service.getCharacteristic(security_number_id);

  config_characteristics.set('accel_range', accel_range_characteristic);
  config_characteristics.set('gyro_range', gyro_range_characteristic);
  config_characteristics.set('refresh_rate', refresh_rate_characteristic);
  config_characteristics.set('serial_number', serial_number_characteristic);


  // get refresh rate
  let refresh_rate_view = await refresh_rate_characteristic.readValue();
  let refresh_rate = refresh_rate_view.getUint32(0, true);
  set_initial_value('refresh_rate', refresh_rate);

  let accel_range_view = await accel_range_characteristic.readValue();
  let accel_range = accel_range_view.getUint32(0, true);
  set_initial_value('accel_range', accel_range);

  let gyro_range_view = await gyro_range_characteristic.readValue();
  let gyro_range = gyro_range_view.getUint32(0, true);
  set_initial_value('gyro_range', gyro_range);

  let serial_number_view = await serial_number_characteristic.readValue();
  let serial_number = serial_number_view.getUint32(0, true);
  set_initial_value('serial_number', serial_number);

  let mac_address_view = await mac_address_characteristic.readValue();
  const decoder = new TextDecoder();
  device_mac_address = decoder.decode(mac_address_view);

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
