import { addApiKeyFromForm, deleteApiKeyFromForm, getKeysWithStatus, updateApiKeyFromForm } from "@/app/actions";

export default async function KeysPage() {
  const keys = await getKeysWithStatus();

  const statusLabel = (s: 'good' | 'kem' | 'het') => {
    switch (s) {
      case 'good':
        return 'tốt';
      case 'kem':
        return 'kém';
      case 'het':
        return 'hết rồi';
    }
  };

  const statusClass = (s: 'good' | 'kem' | 'het') => {
    switch (s) {
      case 'good':
        return 'contrast';
      case 'kem':
        return 'secondary';
      case 'het':
        return 'danger';
    }
  };

  return (
    <section>
      <h3>Quản lý API Keys</h3>

      <article>
        <header>Thêm API Key</header>
        <form action={addApiKeyFromForm} className="grid">
          <label>
            Nhãn
            <input type="text" name="label" placeholder="Ví dụ: Key #1" />
          </label>
          <label>
            API Key
            <input type="password" name="apiKey" placeholder="sk-..." required />
          </label>
          <button type="submit" className="submit">Thêm</button>
        </form>
      </article>

      <article>
        <header>Danh sách Keys</header>
        {keys.length === 0 ? (
          <p>Chưa có key nào.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nhãn</th>
                <th>ID</th>
                <th>Đã dùng (giờ)</th>
                <th>Còn lại (giờ)</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id}>
                  <td>{k.label ?? '(không nhãn)'}</td>
                  <td><small>{k.id}</small></td>
                  <td>{k.usedHours.toFixed(2)}</td>
                  <td>{k.remainingHours.toFixed(2)}</td>
                  <td>
                    <span className={`pill ${statusClass(k.status)}`}>{statusLabel(k.status)}</span>
                  </td>
                  <td>
                    <details>
                      <summary>Sửa/Xóa</summary>
                      <div className="grid">
                        <form action={updateApiKeyFromForm}>
                          <input type="hidden" name="id" value={k.id} />
                          <label>
                            Nhãn
                            <input type="text" name="label" defaultValue={k.label ?? ''} />
                          </label>
                          <label>
                            API Key (để trống nếu không đổi)
                            <input type="password" name="apiKey" placeholder="sk-..." />
                          </label>
                          <button type="submit" className="secondary">Cập nhật</button>
                        </form>
                        <form action={deleteApiKeyFromForm}>
                          <input type="hidden" name="id" value={k.id} />
                          <button type="submit" className="contrast">Xóa</button>
                        </form>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </section>
  );
}
