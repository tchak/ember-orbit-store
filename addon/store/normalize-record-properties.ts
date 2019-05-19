import { Schema, RecordRelationship, Record as OrbitRecord, ModelDefinition, RecordIdentity } from '@orbit/data';
import { deepSet } from '@orbit/utils';

type Properties = Record<string, unknown>;

export default function normalizeRecordProperties(schema: Schema, properties: Properties) {
  const { id, type } = properties;
  const modelDefinition = schema.getModel(type as string);
  const record = { id, type } as OrbitRecord;

  assignKeys(modelDefinition, record, properties);
  assignAttributes(modelDefinition, record, properties);
  assignRelationships(modelDefinition, record, properties);

  return record;
}

function assignKeys(modelDefinition: ModelDefinition, record: OrbitRecord, properties: Properties) {
  const keys = modelDefinition.keys || {};
  for (let key of Object.keys(keys)) {
    if (properties[key] !== undefined) {
      deepSet(record, ['keys', key], properties[key]);
    }
  }
}

function assignAttributes(modelDefinition: ModelDefinition, record: OrbitRecord, properties: Properties) {
  const attributes = modelDefinition.attributes || {};
  for (let attribute of Object.keys(attributes)) {
    if (properties[attribute] !== undefined) {
      deepSet(record, ['attributes', attribute], properties[attribute]);
    }
  }
}

function assignRelationships(modelDefinition: ModelDefinition, record: OrbitRecord, properties: Properties) {
  const relationships = modelDefinition.relationships || {};
  for (let relationship of Object.keys(relationships)) {
    if (properties[relationship] !== undefined) {
      let relationshipType = relationships[relationship].model as string;
      deepSet(record, ['relationships', relationship], normalizeRelationship(relationshipType, properties[relationship]));
    }
  }
}

function normalizeRelationship(type: string, value: unknown) {
  const relationship: RecordRelationship = {};

  if (Array.isArray(value)) {
    relationship.data = value.map(id => {
      if (typeof id === 'object') {
        id = id.id;
      }
      return { type, id } as RecordIdentity;
    });
  } else if (value === null) {
    relationship.data = null;
  } else if (typeof value === 'string') {
    relationship.data = { type, id: value } as RecordIdentity;
  } else {
    let id = (value as RecordIdentity).id;
    relationship.data = { type, id } as RecordIdentity;
  }

  return relationship;
}
