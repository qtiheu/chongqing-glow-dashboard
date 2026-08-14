import { LEVELS } from "@/lib/levels";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function LevelGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">等级科普</CardTitle>
        <CardDescription>鲜艳度（Vividness）五档等级 · 统一映射</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">等级</TableHead>
              <TableHead className="w-28">鲜艳度</TableHead>
              <TableHead>实拍效果</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {LEVELS.map((l) => (
              <TableRow key={l.level}>
                <TableCell>
                  <Badge className={cn("px-2.5 py-0.5", l.badge)}>{l.level}</Badge>
                </TableCell>
                <TableCell className="tabular text-muted-foreground">{l.range}</TableCell>
                <TableCell className="text-muted-foreground">{l.desc}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
