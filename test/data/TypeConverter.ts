/// <reference path="../typings/tsd.d.ts" />
import assert = require("assert")
import { BaseTypeConverter, StandardTypeConverter, ITypeConversionResult }
	from '../../src/data/TypeConverter';


describe('data.TypeConverter', function() {
	var conv: StandardTypeConverter = new StandardTypeConverter();

    it('basic functionality', function() {

		assert.deepEqual(conv.convert('false', 'boolean'), {
			success: true,
			resultType: 'boolean',
			result: false
		});
		assert.deepEqual(conv.convert('FaLsE', 'boolean'), {
			success: true,
			resultType: 'boolean',
			result: false
		});
		assert.deepEqual(conv.convert('true', 'boolean'), {
			success: true,
			resultType: 'boolean',
			result: true
		});
		assert.deepEqual(conv.convert('TrUe', 'boolean'), {
			success: true,
			resultType: 'boolean',
			result: true
		});

    });

	describe('autoConvertString', function() {

		it('boolean', function() {
			assert.deepEqual(conv.autoConvertString('false'), {
				success: true,
				resultType: 'boolean',
				result: false
			});
			assert.deepEqual(conv.autoConvertString('true'), {
				success: true,
				resultType: 'boolean',
				result: true
			});
		});

		it('date', function() {
			let res: ITypeConversionResult;

			// ISO Date
			res = conv.autoConvertString('2014-05-02');
			assert.strictEqual(res.resultType, 'date');
			assert.strictEqual(res.result.toISOString(), '2014-05-02T00:00:00.000Z');

			// ISO datetime
			res = conv.autoConvertString('2014-03-03T23:59:59');
			assert.strictEqual(res.resultType, 'date');
			assert.strictEqual(res.result.toISOString(), '2014-03-03T23:59:59.000Z');

			// US Dates
			res = conv.autoConvertString('05/02/2014');
			assert.strictEqual(res.resultType, 'date');
			assert.strictEqual(res.result.toISOString(), '2014-05-02T00:00:00.000Z');

			res = conv.autoConvertString('5/2/2014');
			assert.strictEqual(res.resultType, 'date');
			assert.strictEqual(res.result.toISOString(), '2014-05-02T00:00:00.000Z');

			// German Style Dates
			res = conv.autoConvertString('02.05.2014');
			assert.strictEqual(res.resultType, 'date');
			assert.strictEqual(res.result.toISOString(), '2014-05-02T00:00:00.000Z');

			res = conv.autoConvertString('2.5.2014');
			assert.strictEqual(res.resultType, 'date');
			assert.strictEqual(res.result.toISOString(), '2014-05-02T00:00:00.000Z');

		});


		it('number', function() {
			let res: ITypeConversionResult;

			// US Number
			res = conv.autoConvertString('3100.2');
			assert.strictEqual(res.resultType, 'number');
			assert.strictEqual(res.result, 3100.2);

			res = conv.autoConvertString('1,300.500');
			assert.strictEqual(res.resultType, 'number');
			assert.strictEqual(res.result, 1300.5);

			// GER Number
			res = conv.autoConvertString('1500,2');
			assert.strictEqual(res.resultType, 'number');
			assert.strictEqual(res.result, 1500.2);

			res = conv.autoConvertString('1.100,2');
			assert.strictEqual(res.resultType, 'number');
			assert.strictEqual(res.result, 1100.2);
		});
	});
});