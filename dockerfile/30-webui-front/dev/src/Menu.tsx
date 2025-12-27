import type { OK } from './util'

export const Menu: preact.FunctionComponent<{
  session: OK<{ user: string }> | undefined
  logout: () => void
}> = ({ session, logout }) =>
  session?.ok !== true ? (
    <ul>
      <li>webui</li>
    </ul>
  ) : (
    <ul>
      <li>
        <a href="#">イメージ一覧</a>
      </li>
      <li>{session.data.user}</li>
      <li>
        <a href="#" onClick={logout}>
          ログアウト
        </a>
      </li>
    </ul>
  )
