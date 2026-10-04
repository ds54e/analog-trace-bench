const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

// Exercise event behavior without claiming browser/layout coverage.
function fixture() {
  const panels = [1, 2, 3].map((number) => ({id: `run-panel-${number}`, hidden: number !== 1}));
  const tabs = panels.map((panel, index) => {
    const attributes = {'aria-controls': panel.id, 'aria-selected': String(index === 0)};
    const handlers = {};
    const classes = new Set(index === 0 ? ['is-active'] : []);
    return {
      attributes, handlers, classes, tabIndex: 0, focused: false,
      getAttribute: (key) => attributes[key],
      setAttribute: (key, value) => { attributes[key] = value; },
      classList: {toggle: (key, enabled) => enabled ? classes.add(key) : classes.delete(key)},
      addEventListener: (key, handler) => { handlers[key] = handler; },
      focus() { this.focused = true; },
    };
  });
  const document = {
    querySelector: () => ({querySelectorAll: () => tabs}),
    getElementById: (id) => panels.find((panel) => panel.id === id),
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../site/assets/trace.js'), 'utf8'), {document});
  const key = (index, value) => {
    const event = {key: value, prevented: false, preventDefault() { this.prevented = true; }};
    tabs[index].handlers.keydown(event);
    return event;
  };
  return {tabs, panels, key};
}

function selected(fixture, index) {
  assert.deepEqual(fixture.tabs.map((tab) => tab.attributes['aria-selected']),
                   fixture.tabs.map((_, i) => String(i === index)));
  assert.deepEqual(fixture.tabs.map((tab) => tab.tabIndex), fixture.tabs.map((_, i) => i === index ? 0 : -1));
  assert.deepEqual(fixture.tabs.map((tab) => tab.classes.has('is-active')), fixture.tabs.map((_, i) => i === index));
  assert.deepEqual(fixture.panels.map((panel) => panel.hidden), fixture.panels.map((_, i) => i !== index));
}

test('initial selection has a single keyboard tab stop', () => selected(fixture(), 0));
test('click changes the selected panel', () => {
  const state = fixture();
  state.tabs[2].handlers.click();
  selected(state, 2);
});
test('arrow navigation wraps and moves focus', () => {
  const state = fixture();
  assert.equal(state.key(0, 'ArrowLeft').prevented, true);
  selected(state, 2);
  assert.equal(state.tabs[2].focused, true);
  state.key(2, 'ArrowRight');
  selected(state, 0);
});
test('Home and End select the first and last tabs', () => {
  const state = fixture();
  state.key(0, 'End');
  selected(state, 2);
  state.key(2, 'Home');
  selected(state, 0);
});
test('unhandled keys retain native behavior', () => {
  const state = fixture();
  assert.equal(state.key(0, 'Tab').prevented, false);
  selected(state, 0);
});
test('pages without run tabs do not throw', () => {
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../site/assets/trace.js'), 'utf8'),
                    {document: {querySelector: () => null}});
});
