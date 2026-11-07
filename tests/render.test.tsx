import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../src/App';

test('App renders its full demo dashboard without browser globals or runtime errors', () => {
  const html = renderToStaticMarkup(<App />);
  assert.match(html, /Lắng nghe khách hàng/);
  assert.match(html, /Nhập review mới/);
  assert.match(html, /Dữ liệu mẫu/);
  assert.match(html, /dữ liệu giả lập/);
  assert.match(html, /Mỏng nhẹ, thấm nhanh/);
  assert.match(html, /Xem kịch bản/);
  assert.match(html, /Cảm xúc trong review/);
  assert.equal(html.includes('NaN'), false);
  assert.equal(html.includes('[object Object]'), false);
});
