import { clone } from "@orbit/utils";
import { QueryBuilder, SortQBParam, FilterQBParam, QueryOrExpression } from "@orbit/data";

import Cache from "./cache";
import Store from "./store";

type Queryable = Store | Cache;

export default class Scope {
  private readonly _type: string;
  private readonly _queryable: Queryable;
  private _filter?: FilterQBParam;
  private _sort?: SortQBParam;

  constructor(type: string, queryable: Queryable) {
    this._type = type;
    this._queryable = queryable;
  }

  live(options?: object) {
    const query = this.queryBuilder();
    if (this._queryable instanceof Store) {
      throw new Error('Only cache can execute a live query.');
    }
    return this._queryable.liveQuery(query, options);
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

  query(queryOrExpression: QueryOrExpression, options?: object, id?: string) {
    return this._queryable.query(queryOrExpression, options, id);
  }

  private copy() {
    return clone(this);
  }

  private queryBuilder(id?: string) {
    return (q: QueryBuilder) => {
      if (id) {
        return q.findRecord({ type: this._type, id });
      } else {
        let terms = q.findRecords(this._type);
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
