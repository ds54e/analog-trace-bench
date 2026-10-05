const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '../site/assets/trace.js'), 'utf8');

// Exercise keyboard enhancement; native navigation is checked in a browser.
function fixture(count = 3) {
  const links = Array.from({length: count}, () => ({
    handlers: {}, focused: false,
    addEventListener(key, handler) { this.handlers[key] = handler; },
    focus() { this.focused = true; },
  }));
  vm.runInNewContext(script, {document: {
    querySelector: () => ({querySelectorAll: () => links}),
  }});
  const key = (index, value) => {
    const event = {key: value, prevented: false, preventDefault() { this.prevented = true; }};
    links[index].handlers.keydown(event);
    return event;
  };
  return {links, key};
}

test('click activation remains native', () => {
  assert(fixture().links.every(link => !link.handlers.click));
});
test('arrow keys wrap focus between recorded runs', () => {
  const state = fixture();
  assert.equal(state.key(0, 'ArrowLeft').prevented, true);
  assert.equal(state.links[2].focused, true);
  state.key(2, 'ArrowRight');
  assert.equal(state.links[0].focused, true);
});
test('Home and End focus the first and last recorded runs', () => {
  const state = fixture();
  state.key(1, 'End');
  assert.equal(state.links[2].focused, true);
  state.key(2, 'Home');
  assert.equal(state.links[0].focused, true);
});
test('Enter and Tab retain native link behavior', () => {
  const state = fixture();
  for (const key of ['Enter', 'Tab']) assert.equal(state.key(0, key).prevented, false);
});
test('a single recorded run retains keyboard focus', () => {
  const state = fixture(1);
  state.key(0, 'ArrowRight');
  assert.equal(state.links[0].focused, true);
});
test('pages without run navigation do not throw', () => {
  vm.runInNewContext(script, {document: {querySelector: () => null}});
});
