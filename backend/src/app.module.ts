import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { HomeworkModule } from './homework/homework.module';
import { LessonsModule } from './lessons/lessons.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { StudentsModule } from './students/students.module';
import { UsersModule } from './users/users.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { WalletsModule } from './wallets/wallets.module';
import { FinanceModule } from './finance/finance.module';
import { CategoriesModule } from './categories/categories.module';
import { TelegramModule } from './telegram/telegram.module';
import { OutboxModule } from './outbox/outbox.module';
import { InvitesModule } from './invites/invites.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    StudentsModule,
    LessonsModule,
    HomeworkModule,
    NotificationsModule,
    TelegramModule,
    OutboxModule,
    InvitesModule,
    AnalyticsModule,
    WalletsModule,
    FinanceModule,
    CategoriesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
