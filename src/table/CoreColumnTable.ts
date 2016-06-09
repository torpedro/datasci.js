/// <reference path='../typedefs/ITable.ts' />

import _ = require('underscore');
import { FieldDescriptor, FieldArgument } from '../../src/table/FieldDescriptor';
import { HashMap } from '../data/HashMap';
import { Vector } from '../../src/data/Vector';
import { Set } from '../data/Set';
import { vec } from '../data/VectorOperations';

import { ITypeConversionResult } from '../types/TypeEnvironment';
import { StandardTypeEnv as TypeEnv } from '../types/StandardTypeEnv';



/**
 * @class CoreColumnTable
 *
 * This table is implemented as a column store.
 * TODO: enforce types
 * TODO: remove row
 * TODO: allow to define constraints/validators
 */
export class CoreColumnTable implements ITable {
	protected _attributeVectors: HashMap<string, Vector>;
	protected _fields: Set;
	protected _types: string[];

	/**
	 * Creates a new CoreColumnTable
	 */
	constructor(def: (ITableDefinition | CoreColumnTable)) {
		if (def instanceof CoreColumnTable) {
			this.initWithTable(<CoreColumnTable> def);
		} else if (typeof def === 'object') {
			this.initWithTableDef(<ITableDefinition> def);
		} else {
			throw `Couldn't initialize CoreColumnTable with the given parameters!`;
		}
	}

	/**
	 * inserts an array of rows into the table
	 */
	insert(rows: any[][]): void {
		for (let r: number = 0; r < rows.length; ++r) {
			this.addRow(rows[r]);
		}
	}

	/**
	 * returns the number of rows in the table
	 */
	count(): number {
		return this.column(this._fields.get(0)).length;
	}

	/**
	 * adds a new field to the table of the given type
	 * fills the column with null-values
	 */
	addField(name: string, type?: string): void {
		type = (typeof type === 'undefined') ? TypeEnv.kAny : type;

		this._fields.add(name);
		this._types.push(type);

		// push null-values for existing rows
		let data: any[] = [];
		for (let r: number = 0; r < this.count(); ++r) {
			data.push(null);
		}

		let vector: Vector = new Vector(type, data);
		this._attributeVectors.set(name, vector);
	}

	fields(): string[] {
		return this._fields.get();
	}

	numFields(): number {
		return this._fields.size();
	}

	hasField(name: string): boolean {
		return this._fields.contains(name);
	}

	types(): string[] {
		return this._types;
	}

	type(name: string): string {
		if (this._fields.contains(name)) {
			return this._types[this.getFieldNameIndex(name)];
		} else {
			// check for special reserved system names
			if (name === '$rownr') return TypeEnv.kNumber;

			throw `Could not find column with name "${name}"!`;
		}
	}

	isEmpty(): boolean {
		return this.count() === 0;
	}

	rows(): Row[] {
		let rows: Row[] = [];
		for (let r: number = 0; r < this.count(); ++r) {
			rows.push(this.row(r));
		}
		return rows;
	}

	row(r: number): Row {
		// build the row from the attribute vectors
		let record: Row = [];
		for (let c: number = 0; c < this.numFields(); ++c) {
			record.push(this.value(r, this._fields.get(c)));
		}

		return record;
	}

	vector(field: FieldArgument): Vector {
		let desc: FieldDescriptor = this.getFieldDescriptor(field);
		return this._attributeVectors[desc.name];
	}

	getFieldDescriptor(arg: FieldArgument): FieldDescriptor {
		if (typeof arg === 'number') {
			let name: string = this._fields[arg];
			return new FieldDescriptor(name);

		} else if (typeof arg === 'string') {
			return new FieldDescriptor(arg);

		} else if (arg instanceof FieldDescriptor) {
			return arg;
		}
	}

	getFieldNameIndex(field: string): number {
		let index: number = this._fields.indexOf(field);
		if (index === -1) throw `Field "${field}" does not exist!`;
		return index;
	}

	value(row: number, column: string): any {
		return this.column(column)[row];
	}

	setValue(row: number, column: string, value: any): void {
		this.column(column)[row] = value;
	}

	/**
	 * adds empty rows to the table, until the table has at least
	 * as many rows as specified
	 */
	reserve(numRows: number): void {
		if (this.numFields() === 0) throw `Can't reserve rows on a table without fields!`;
		while (this.count() < numRows) {
			this.addRow([]);
		}
	}

	column(name: string): any[] {
		if (this._fields.contains(name)) {
			return this._attributeVectors.get(name).getData();
		} else {
			// check for special reserved system names
			if (name === '$rownr') {
				return this.createRowNrColumn();
			}

			throw `Could not find column with name "${name}"!`;
		}
	}

	columns(): any[][] {
		let columns: any[][] = [];
		for (let i: number = 0; i < this._fields.size(); ++i) {
			columns.push(this.column(this._fields.get(i)).slice());
		}
		return columns;
	}

	detectTypes(setTypes: boolean): string[] {
		let types: string[] = _.map(this._fields.get(), (name: string, c: number): string => {
			return vec.detectDataType(this._attributeVectors.get(name).getData());
		});
		if (setTypes) {
			for (let i: number = 0; i < types.length; ++i) {
				this.setType(this._fields.get(i), types[i]);
			}
		}
		return types;
	}

	setType(field: string, type: string): void {
		let i: number = this.getFieldNameIndex(field);
		if (type !== this._types[i]) {
			this._types[i] = type;

			// convert types
			let old: Vector = this._attributeVectors.get(field);
			let newData: any[] = vec.convertToType(old.getData(), type);
			let vector: Vector = new Vector(type, newData);
			this._attributeVectors.set(field, vector);
		}
	}

	private createRowNrColumn(): number[] {
		let vector: number[] = [];
		for (let r: number = 0; r < this.count(); ++r) {
			vector.push(r);
		}
		return vector;
	}

	protected initWithTableDef(def: ITableDefinition): void {
		// initialize the fields
		// throw error if field names are not unique
		this._fields = new Set(def.fields);
		if (def.fields.length !== this._fields.size()) {
			throw `No duplicate field names allowed!`;
		}

		// initialize the types
		// if types are undefined, we set them to 'any' by default
		if (def.types) {
			if (def.fields.length !== def.types.length) {
				throw `Number of fields and number of types do not match!`;
			}
			this._types = def.types;
		} else {
			this._types = [];
			for (let c: number = 0; c < def.fields.length; ++c) {
				this._types.push(TypeEnv.kAny);
			}
		}

		// initialize the attribute vectors
		this._attributeVectors = new HashMap<string, Vector>();
		if (def.columns) {
			if (def.fields.length !== def.columns.length) {
				throw `Number of fields and number of supplied columns do not match!`;
			}

			let numRows: number = def.columns[0].length;
			for (let c: number = 0; c < def.fields.length; ++c) {
				if (def.columns[c].length !== numRows) {
					throw `Number of rows in TableDefiniton is not uniform!`;
				}

				let vector: Vector = new Vector(this._types[c], def.columns[c].slice());
				this._attributeVectors.set(def.fields[c], vector);
			}

		} else {
			// create empty attribute vectors
			for (let c: number = 0; c < def.fields.length; ++c) {
				let vector: Vector = new Vector(this._types[c]);
				this._attributeVectors.set(def.fields[c], vector);
			}
		}
	}

	protected initWithTable(table: CoreColumnTable): void {
		this.initWithTableDef({
			fields: table.fields(),
			types: table.types(),
			columns: table.columns()
		});
	}

	/**
	 * adds a new row to the table
	 */
	protected addRow(row: any[]): void {
		if (row.length > this.numFields()) throw `Error when inserting! Row has too many fields!`;

		// typechecks
		for (let c: number = 0; c < row.length; ++c) {
			if (row[c] === undefined) throw `Error when inserting! Can not insert undefined!`;
			let colType: string = this.types()[c];

			// check for null
			// if the inserted value is empty string and the datatype is not string
			// insert null
			if (row[c] === null ||
				(row[c] === '' && colType !== 'string')) {
				row[c] = null;
				// todo: allow definition of 'not null'-constraint

			} else {

				if (colType === 'any') {
					// no typecheck necessary, all values welcome

				} else {
					// try to convert
					let res: ITypeConversionResult = TypeEnv.getInstance().convert(row[c], colType);
					if (res.success) {
						row[c] = res.result;
					} else {
						throw `Error when inserting! Types don't match!`;
					}
				}
			}
		}

		// insert the values
		for (let c: number = 0; c < row.length; ++c) {
			this.column(this._fields.get(c)).push(row[c]);
		}

		// push null-values for non-existant fields
		for (let c: number = row.length; c < this.numFields(); ++c) {
			this.column(this._fields.get(c)).push(null);
		}
	}
}
