import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('Integration | Component | pretty-color', function(hooks) {
  setupRenderingTest(hooks);

  test('should watch for changes', async function(assert) {
    assert.expect(6);

    const store = this.owner.lookup('service:store');
    const record = await store.addRecord('person', { name: 'Paul' });
    const sameRecord = store.cache.scope('person').find(record.id);

    assert.ok(record.isEqual(sameRecord), 'should be instances of same record');

    this.set('record', record);

    await render(hbs`<span class="name" {{watch this.record}}>{{this.record.name}}</span>`);

    assert.equal(record.name, 'Paul', 'record has a name');
    assert.dom('.name').hasText('Paul');

    await record.update({ name: 'Paul Chavard' });

    assert.equal(record.store.cache.readAttribute(record, 'name'), 'Paul Chavard', 'record name in cache should change');
    assert.equal(record.name, 'Paul Chavard', 'record name should change');
    assert.dom('.name').hasText('Paul Chavard');
  });
});
