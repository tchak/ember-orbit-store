import { clone } from "@orbit/utils";
import { QueryBuilder, SortQBParam, FilterQBParam, QueryOrExpression } from "@orbit/data";
import Store, { Cache } from 'ember-orbit-store';

type Queryable = Store | Cache;

export default class Scope {
  private readonly type: string;
  private readonly queryable: Queryable;
  private _filter?: FilterQBParam;
  private _sort?: SortQBParam;

  constructor(type: string, queryable: Queryable) {
    this.type = type;
    this.queryable = queryable;
  }

  query(queryOrExpression: QueryOrExpression, options?: object, id?: string) {
    return this.queryable.query(queryOrExpression, options, id);
  }

  live(options?: object) {
    const query = this.queryBuilder();
    if (this.queryable instanceof Store) {
      throw new Error('Only cache can execute a live query.');
    }
    return this.queryable.liveQuery(query, options);
  }

  all(options?: object) {
    const query = this.queryBuilder();
    return this.query(query, options);
  }

  find(id: string) {
    const query = this.queryBuilder(id);
    return this.query(query);
  }

  where(clause: FilterQBParam) {
    const copy = this.copy();
    copy._filter = clause;
    return copy;
  }

  order(sort: SortQBParam) {
    const copy = this.copy();
    copy._sort = sort;
    return copy;
  }

  private copy() {
    return clone(this);
  }

  private queryBuilder(id?: string) {
    return (q: QueryBuilder) => {
      if (id) {
        return q.findRecord({ type: this.type, id });
      } else {
        let terms = q.findRecords(this.type);
        if (this._filter) {
          terms = terms.filter(this._filter);
        }
        if (this._sort) {
          terms = terms.sort(this._sort);
        }
        return terms;
      }
    }
  }
}
