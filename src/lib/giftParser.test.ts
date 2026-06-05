import { describe, it, expect } from 'vitest';
import { parseGIFT } from './giftParser';

describe('GIFT Parser', () => {
    it('parses Multiple Choice questions', () => {
        const input = `
// Comment
::Question Title:: Who is buried in Grant's tomb? {=Grant ~No one ~Napoleon ~Churchill}
    `;
        const questions = parseGIFT(input);
        expect(questions).toHaveLength(1);
        const q = questions[0];
        expect(q.type).toBe('MC');
        expect(q.text).toBe("Question Title: Who is buried in Grant's tomb? ...");
        expect(q.answer).toBe('Grant');
        expect(q.options).toHaveLength(4);
        expect(q.options).toContain('Grant');
        expect(q.options).toContain('Napoleon');
    });

    it('parses True/False questions', () => {
        const input = `Grant is buried in Grant's tomb.{TRUE}`;
        const questions = parseGIFT(input);
        expect(questions).toHaveLength(1);
        const q = questions[0];
        expect(q.type).toBe('TF');
        expect(q.answer).toBe(true);
    });

    it('parses Short Answer questions', () => {
        const input = `Who is buried in Grant's tomb?{=Grant =Ulysses S. Grant}`;
        const questions = parseGIFT(input);
        expect(questions).toHaveLength(1);
        const q = questions[0];
        expect(q.type).toBe('SHORT');
        expect(q.answer).toEqual(['Grant', 'Ulysses S. Grant']);
    });

    it('handles multiple questions in one block', () => {
        const input = `
Q1 {=A ~B}

Q2 {TRUE}
    `;
        const questions = parseGIFT(input);
        expect(questions).toHaveLength(2);
        expect(questions[0].type).toBe('MC');
        expect(questions[1].type).toBe('TF');
    });
});
