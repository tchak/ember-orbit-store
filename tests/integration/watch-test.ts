import { module, test } from 'qunit';
import 'qunit-dom';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

import Store from 'ember-orbit-store';
import Model from 'ember-orbit-store/model';

module('Integration | watch', function(hooks) {
  setupRenderingTest(hooks);

  test('should watch for record changes', async function(assert) {
    assert.expect(5);

    const store: Store = this.owner.lookup('service:store');
    const record = (await store.addRecord({ type: 'person', name: 'Paul' })) as Model;
    const sameRecord = (store.cache.findRecord({ type: 'person', id: record.id })) as Model;

    assert.ok(record.id === sameRecord.id, 'should be instances of same record');

    this.set('record', record);

    await render(hbs`<span class="name" {{watch this.record}}>{{this.record.name}}</span>`);

    assert.equal(record.name, 'Paul', 'record has a name');
    assert.dom('.name').hasText('Paul');

    await record.update({ name: 'Paul Chavard' });

    assert.equal(record.name, 'Paul Chavard', 'record name should change');
    assert.dom('.name').hasText('Paul Chavard');
  });

  test('should watch for collection changes', async function(assert) {
    assert.expect(6);

    const store: Store = this.owner.lookup('service:store');
    await store.addRecord({ type: 'person', id: '1', name: 'Paul' });
    const recordsArray = store.cache.liveQuery(q => q.findRecords('person'));

    this.set('recordsArray', recordsArray);

    await render(hbs`<ul class="collection" {{watch this.recordsArray}}>
      {{#each this.recordsArray as |record|}}
        {{record.name}}
      {{/each}}
    </ul>`);

    assert.equal(recordsArray.length, 1, 'records array has one record');
    assert.equal([...recordsArray][0].name, 'Paul', 'first record has a name');
    assert.dom('.collection').hasText('Paul');

    await store.addRecord({ type: 'person', id: '2', name: 'Eve' });

    assert.equal(recordsArray.length, 2, 'records array has two records');
    assert.equal([...recordsArray][1].name, 'Eve', 'second record has a name');
    assert.dom('.collection').hasText('Paul Eve');
  });
});
