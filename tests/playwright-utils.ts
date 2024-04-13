/* eslint-disable no-empty-pattern */

import { test as base, expect as baseExpect } from '@playwright/test'
import type { ConsoleMessage, Locator, Page } from '@playwright/test'
import * as setCookieParser from 'set-cookie-parser'
import { PartialDeep } from 'type-fest'
import { z } from 'zod'

import { authCookie, getNewSalt, hashPassword } from '~/auth'
import { prisma } from '~/db/prisma.server'

import { makeAccount } from './factories/account'
import { Board, makeBoard, makeTask } from './factories/board'

type Account = {
  id: string
  email: string
  password: string
}

function makeSignUpFixture({
  onAccountSaved,
}: {
  onAccountSaved: (accountId: string) => void
}) {
  return async function signUp(options?: Partial<Account>) {
    const { email, password } = makeAccount(options)
    const salt = getNewSalt()
    const hash = hashPassword({ password, salt })
    const savedAccount = await prisma.account.create({
      data: {
        email,
        Password: {
          create: {
            hash,
            salt,
          },
        },
      },
    })
    onAccountSaved(savedAccount.id)
    return { email, password, id: savedAccount.id }
  }
}
type SignUpFixture = ReturnType<typeof makeSignUpFixture>

function makeLoginFixture({
  signUp,
  page,
}: {
  signUp: SignUpFixture
  page: Page
}) {
  return async function login(options?: Partial<Account>) {
    const { id, email } = await signUp(options)
    const serializedAuthCookie = await authCookie.serialize(id)

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const cookieConfig = setCookieParser.parseString(
      serializedAuthCookie,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any

    await page.context().addCookies([{ ...cookieConfig, domain: 'localhost' }])

    return { id, email }
  }
}
type LoginFixture = ReturnType<typeof makeLoginFixture>

function makeCreateBoardFixture({ login }: { login: LoginFixture }) {
  return async function createBoard(options?: PartialDeep<Board>) {
    const { id: accountId } = await login()
    const board = makeBoard(options)

    const savedBoard = await prisma.board.create({
      select: {
        name: true,
        id: true,
        columns: { select: { name: true, id: true } },
      },
      data: {
        name: board.name,
        owner: {
          connect: {
            id: accountId,
          },
        },
        columns: {
          create: board.columns.map(({ name, id }) => ({
            name,
            id,
          })),
        },
      },
    })
    return savedBoard
  }
}
type CreateBoardFixture = ReturnType<typeof makeCreateBoardFixture>

function makeCreateTasksFixture() {
  return async function createTasks(
    ...options: Array<
      Parameters<typeof makeTask>[0] & { boardId: string; columnId: string }
    >
  ) {
    return await Promise.all(
      options.map((taskOption) => {
        const { boardId, columnId, ...taskData } = taskOption
        const task = makeTask(taskData)

        return prisma.task.create({
          data: {
            title: task.title,
            description: task.description,
            subtasks: {
              create: task.subtasks.map(({ title, isCompleted }) => ({
                title,
                isCompleted,
              })),
            },
            Column: {
              connect: {
                id: columnId,
              },
            },
            Board: {
              connect: {
                id: boardId,
              },
            },
          },
        })
      }),
    )
  }
}
type CreateTasksFixture = ReturnType<typeof makeCreateTasksFixture>

function makeIsSmallScreenFixture({ page }: { page: Page }) {
  return function isSmallScreen() {
    const viewportWidth = page.viewportSize()?.width
    if (!viewportWidth) {
      throw new Error('Viewport width is not set')
    }

    // Ideally we'd get this from the tailwind config somehow
    return viewportWidth < 640
  }
}
type IsSmallScreenFixture = ReturnType<typeof makeIsSmallScreenFixture>

class KanbanPageObject {
  constructor(
    private page: Page,
    private isSmallScreen: IsSmallScreenFixture,
  ) {}

  async gotoHome() {
    await this.page.goto('/')
  }

  async openMobileNav() {
    await this.page.getByRole('button', { name: /select a board/i }).click()
    return this.page.getByRole('navigation')
  }

  async gotoBoard(boardName: string | RegExp) {
    await this.gotoHome()

    // On small screens the board navigation is nested inside the mobile nav dialog
    if (this.isSmallScreen()) {
      await this.openMobileNav()
    }
    await this.page.getByRole('link', { name: boardName }).click()

    return new BoardPageObject(this.page)
  }

  async openCreateBoardDialog() {
    // On small screens, the create board button is nested inside the select a board mobile nav dialog
    if (this.isSmallScreen()) {
      await this.openMobileNav()
    }
    await this.page.getByRole('button', { name: /create new board/i }).click()

    return this.page.getByRole('dialog', { name: /add new board/i })
  }

  async getBoardNav() {
    if (this.isSmallScreen()) {
      return this.openMobileNav()
    }
    return this.page.getByRole('navigation')
  }
}

class BoardPageObject {
  constructor(private page: Page) {}

  async openBoardMenu() {
    await this.page.getByRole('button', { name: /board menu/i }).click()
  }

  async openEditBoardDialog() {
    await this.openBoardMenu()
    await this.page.getByRole('menuitem', { name: /edit board/i }).click()

    return this.page.getByRole('dialog', { name: /edit board/i })
  }

  async openDeleteBoardDialog() {
    await this.openBoardMenu()
    await this.page.getByRole('menuitem', { name: /delete board/i }).click()

    return this.page.getByRole('alertdialog', { name: /delete this board/i })
  }
}

export const test = base.extend<{
  signUp: SignUpFixture
  login: LoginFixture
  createBoard: CreateBoardFixture
  createTasks: CreateTasksFixture
  kanbanPage: KanbanPageObject
  isSmallScreen: IsSmallScreenFixture
}>({
  signUp: async ({}, use) => {
    let accountId = ''
    await use(makeSignUpFixture({ onAccountSaved: (id) => (accountId = id) }))
    await prisma.account.delete({
      where: { id: accountId },
    })
  },
  login: async ({ signUp, page }, use) => {
    await use(makeLoginFixture({ signUp, page }))
  },
  createBoard: async ({ login }, use) => {
    await use(makeCreateBoardFixture({ login }))
  },
  createTasks: async ({}, use) => {
    await use(makeCreateTasksFixture())
  },
  page: async ({ page }, use) => {
    // Validate that no console errors or warnings happen
    const consoleErrors: Array<{ content: string } & ConsoleMessage> = []
    const consoleWarnings: Array<{ content: string } & ConsoleMessage> = []
    page.on('console', (message) => {
      switch (message.type()) {
        case 'error':
          consoleErrors.push({ ...message, content: message.text() })
          return

        case 'warning':
          consoleWarnings.push({ ...message, content: message.text() })
          return
      }
    })
    await use(page)
    expect(consoleErrors).toHaveLength(0)
    expect(consoleWarnings).toHaveLength(0)
  },
  isSmallScreen: async ({ page }, use) => {
    await use(makeIsSmallScreenFixture({ page }))
  },
  kanbanPage: async ({ page, isSmallScreen }, use) => {
    await use(new KanbanPageObject(page, isSmallScreen))
  },
})

const matcherReturnTypeSchema = z.object({
  message: z.function().returns(z.string()),
  pass: z.boolean(),
  name: z.string().optional(),
  expected: z.unknown().optional(),
  actual: z.unknown().optional(),
  log: z.array(z.string()).optional(),
})
type MatcherReturnType = z.infer<typeof matcherReturnTypeSchema>

const matcherErrorSchema = z.object({
  matcherResult: matcherReturnTypeSchema,
})

export const expect = baseExpect.extend({
  async toBeAriaInvalid(locator: Locator, options?: { timeout?: number }) {
    const assertionName = 'toBeAriaInvalid'
    let pass: boolean
    let matcherResult: MatcherReturnType | null = null

    try {
      await baseExpect(locator).toHaveAttribute('aria-invalid', 'true', options)
      pass = true
    } catch (error) {
      const errorResult = matcherErrorSchema.safeParse(error)
      if (!errorResult.success) throw error

      matcherResult = errorResult.data.matcherResult
      pass = false
    }

    const message = pass
      ? () => 'Element is aria-invalid'
      : () => 'Element is not aria-invalid'

    return {
      message,
      pass,
      name: assertionName,
      expected: 'true',
      actual: matcherResult?.actual,
    }
  },
  async toBeDescribedBy(
    locator: Locator,
    expected: string,
    options?: { timeout?: number },
  ) {
    const assertionName = 'toBeDescribedBy'
    let pass: boolean
    let matcherResult: MatcherReturnType | null = null

    try {
      await baseExpect(locator).toHaveAttribute('aria-describedby', options)
      const describedById = await locator.getAttribute('aria-describedby')
      // The assertion above means we shouldn't ever throw here
      if (!describedById) throw new Error('aria-describedby is not set')
      const escapedDescribedById = describedById.replace(/:/g, '\\:')
      const errorMessage = locator.page().locator(`#${escapedDescribedById}`)
      await baseExpect(errorMessage).toHaveText(expected, options)
      await baseExpect(errorMessage).toBeVisible(options)

      pass = true
    } catch (error) {
      const errorResult = matcherErrorSchema.safeParse(error)
      if (!errorResult.success) throw error

      matcherResult = errorResult.data.matcherResult
      pass = false
    }

    const message = pass
      ? () => `Element is described by ${expected}`
      : () => `Element is not described by ${expected}`

    return {
      message,
      pass,
      name: assertionName,
      expected,
      actual: matcherResult?.actual,
    }
  },
})
